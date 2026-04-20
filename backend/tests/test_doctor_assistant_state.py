"""
Unit tests for the DB-backed `AssistantSessionState`.

DB is mocked with the same chained-MagicMock pattern used across
the other aggregator tests. We verify:
- a new conversation is created when the id is missing or doesn't
  belong to the doctor
- history trimming to the max window on read
- doctor-scoping on every operation (no cross-doctor access)
- delete hard-removes only when owned
"""

from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from agents.doctor_assistant.state import AssistantSessionState


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _row(**kwargs):
    """Stand-in for an AssistantConversation ORM row."""
    defaults = dict(
        id=7,
        doctor_id=1,
        title=None,
        current_patient_id=None,
        created_at=datetime(2026, 4, 20, 10, 0),
        last_activity=datetime(2026, 4, 20, 10, 5),
    )
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def _msg(id_, role, content, tool_calls=None, ts=None):
    return SimpleNamespace(
        id=id_,
        role=role,
        content=content,
        tool_calls=tool_calls,
        created_at=ts or datetime(2026, 4, 20, 10, 5),
    )


def _chain(*, first=None, all_=()):
    q = MagicMock()
    q.filter.return_value = q
    q.order_by.return_value = q
    q.limit.return_value = q
    q.first.return_value = first
    q.all.return_value = list(all_)
    return q


def _mock_db(*results):
    db = MagicMock()
    db.query.side_effect = list(results)
    return db


# ---------------------------------------------------------------------------
# get_or_create
# ---------------------------------------------------------------------------


def test_get_or_create_creates_new_when_no_id():
    db = _mock_db(
        # No messages yet on the freshly created row.
        _chain(all_=[]),
    )
    # The new row gets flushed + refreshed; we stub .refresh to set .id.
    state_obj = AssistantSessionState()

    def _refresh(row):
        row.id = 99
        row.created_at = datetime(2026, 4, 20, 10, 0)
        row.last_activity = datetime(2026, 4, 20, 10, 0)
    db.refresh.side_effect = _refresh

    conv = state_obj.get_or_create(db=db, doctor_id=1)

    assert conv.conversation_id == "99"
    assert conv.doctor_id == 1
    assert conv.history == []
    db.add.assert_called_once()
    db.commit.assert_called_once()


def test_get_or_create_returns_existing_when_id_matches_doctor():
    existing = _row(id=7, doctor_id=1, current_patient_id=42)
    messages = [
        _msg(1, "user", "Hola"),
        _msg(2, "model", "Hola, doctor."),
    ]
    db = _mock_db(
        _chain(first=existing),        # _find_for_doctor
        _chain(all_=list(reversed(messages))),  # _to_dataclass messages (desc)
    )
    state_obj = AssistantSessionState()

    conv = state_obj.get_or_create(
        db=db, doctor_id=1, conversation_id="7", current_patient_id=99
    )

    assert conv.conversation_id == "7"
    # current_patient_id should be updated to the caller's value.
    assert conv.current_patient_id == 99
    # History is returned in chronological order (reversed from desc fetch).
    assert len(conv.history) == 2
    assert conv.history[0]["role"] == "user"
    assert conv.history[1]["role"] == "model"


def test_get_or_create_creates_fresh_when_id_belongs_to_another_doctor():
    # doctor 1 tries to resume conversation 7 which belongs to doctor 42.
    # _find_for_doctor filters by (id AND doctor_id) so returns None.
    db = _mock_db(
        _chain(first=None),   # _find_for_doctor returns None
        _chain(all_=[]),      # _to_dataclass messages (newly created row)
    )

    def _refresh(row):
        row.id = 123
        row.created_at = datetime(2026, 4, 20)
        row.last_activity = datetime(2026, 4, 20)
    db.refresh.side_effect = _refresh

    state_obj = AssistantSessionState()
    conv = state_obj.get_or_create(db=db, doctor_id=1, conversation_id="7")

    # A new conversation was minted, not the stolen one.
    assert conv.conversation_id == "123"
    db.add.assert_called_once()


def test_get_or_create_accepts_non_numeric_id_as_miss():
    """If caller sends garbage as conversation_id we treat it as missing."""
    db = _mock_db(_chain(all_=[]))

    def _refresh(row):
        row.id = 5
        row.created_at = datetime(2026, 4, 20)
        row.last_activity = datetime(2026, 4, 20)
    db.refresh.side_effect = _refresh

    state_obj = AssistantSessionState()
    conv = state_obj.get_or_create(
        db=db, doctor_id=1, conversation_id="not-a-number"
    )
    assert conv.conversation_id == "5"


def test_history_trimmed_to_max_on_read():
    existing = _row(id=7, doctor_id=1)
    # 50 messages; max_history is 4 here.
    recent = [_msg(i, "user" if i % 2 == 0 else "model", f"m{i}") for i in range(50, 0, -1)]
    db = _mock_db(
        _chain(first=existing),
        _chain(all_=recent[:4]),  # mock returns the 4 newest first
    )
    state_obj = AssistantSessionState(max_history=4)
    conv = state_obj.get_or_create(db=db, doctor_id=1, conversation_id="7")

    assert len(conv.history) == 4
    # Reversed back to chronological — the last of the 4 in the original
    # desc fetch (recent[:4][-1]) becomes the first in conv.history.
    assert conv.history[0]["parts"][0] == "m47"


# ---------------------------------------------------------------------------
# append_turn
# ---------------------------------------------------------------------------


def test_append_turn_inserts_both_rows():
    existing = _row(id=7, doctor_id=1)
    db = _mock_db(_chain(first=existing))
    state_obj = AssistantSessionState()

    state_obj.append_turn(
        db=db,
        doctor_id=1,
        conversation_id="7",
        user_message="¿qué tengo hoy?",
        model_response="Dos citas.",
        tool_calls=[{"name": "list_upcoming_appointments", "args": {"range_key": "today"}}],
    )

    # 2 rows added (user + model).
    assert db.add.call_count == 2
    added_roles = [call.args[0].role for call in db.add.call_args_list]
    assert added_roles == ["user", "model"]
    db.commit.assert_called_once()


def test_append_turn_noops_when_conversation_not_owned():
    # _find_for_doctor returns None → no inserts, no commit.
    db = _mock_db(_chain(first=None))
    state_obj = AssistantSessionState()

    state_obj.append_turn(
        db=db,
        doctor_id=1,
        conversation_id="7",
        user_message="x",
        model_response="y",
    )

    db.add.assert_not_called()
    db.commit.assert_not_called()


# ---------------------------------------------------------------------------
# list_recent + get_full + delete
# ---------------------------------------------------------------------------


def test_list_recent_returns_summaries():
    rows = [
        _row(id=10, title="Primera conv", last_activity=datetime(2026, 4, 20, 12, 0)),
        _row(id=9, title=None, last_activity=datetime(2026, 4, 19, 9, 0)),
    ]
    # list_recent makes 1 top-level query, but the _derive_title fallback
    # triggers 1 extra query per row without a title. Second row has no
    # title → extra query.
    db = _mock_db(
        _chain(all_=rows),
        _chain(first=_msg(1, "user", "primer mensaje del paciente")),
    )
    state_obj = AssistantSessionState()

    out = state_obj.list_recent(db=db, doctor_id=1)

    assert len(out) == 2
    assert out[0]["title"] == "Primera conv"
    # Second row had no stored title → derived from first user msg.
    assert "primer mensaje" in out[1]["title"]


def test_get_full_returns_messages_in_order():
    existing = _row(id=7, doctor_id=1)
    msgs = [
        _msg(1, "user", "a"),
        _msg(2, "model", "b"),
        _msg(3, "user", "c"),
    ]
    db = _mock_db(
        _chain(first=existing),
        _chain(all_=msgs),
    )
    state_obj = AssistantSessionState()

    out = state_obj.get_full(db=db, doctor_id=1, conversation_id="7")

    assert out is not None
    assert out["conversation_id"] == "7"
    assert [m["content"] for m in out["messages"]] == ["a", "b", "c"]


def test_get_full_returns_none_when_not_owned():
    db = _mock_db(_chain(first=None))
    state_obj = AssistantSessionState()
    out = state_obj.get_full(db=db, doctor_id=1, conversation_id="999")
    assert out is None


def test_delete_returns_true_when_owned():
    existing = _row(id=7, doctor_id=1)
    db = _mock_db(_chain(first=existing))
    state_obj = AssistantSessionState()

    assert state_obj.delete(db=db, doctor_id=1, conversation_id="7") is True
    db.delete.assert_called_once_with(existing)
    db.commit.assert_called_once()


def test_delete_returns_false_when_not_owned():
    db = _mock_db(_chain(first=None))
    state_obj = AssistantSessionState()

    assert state_obj.delete(db=db, doctor_id=1, conversation_id="7") is False
    db.delete.assert_not_called()
