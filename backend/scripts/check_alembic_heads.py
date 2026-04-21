#!/usr/bin/env python3
"""Fail if the alembic DAG has more than one head.

A parallel head means two migrations declare the same `down_revision`, which
makes `alembic upgrade head` ambiguous and the pipeline silently picks a
branch. Today that bit us: `b8c9d0e1f2a3` (already merged) and `b1c2d3e4f5a6`
(new) both pointed to `a7b8c9d0e1f2`, so the repair migration was never
applied through the linear chain. This check runs before the docker build in
Cloud Build and catches that before anything hits the DB.

Also handles alembic merge migrations, whose `down_revision` is a tuple of
parent revisions (e.g. `down_revision = ("a", "b")`) — those collapse
parallel branches into a single tip and must be counted as consuming ALL
their parents, otherwise the check would falsely flag them as extra heads.

Pure stdlib so it can run on `python:*-alpine` with no pip install.
"""
import re
import sys
from pathlib import Path

VERSIONS = Path(__file__).resolve().parent.parent / "migrations_alembic" / "versions"

REV_RE = re.compile(r'^revision\s*(?::[^=]*)?=\s*["\']([^"\']+)["\']', re.M)
# Single-parent form: down_revision = "abc123"
DOWN_SINGLE_RE = re.compile(r'^down_revision\s*(?::[^=]*)?=\s*["\']([^"\']+)["\']', re.M)
# Merge form: down_revision = ("abc", "def") or ["abc", "def"]
DOWN_TUPLE_RE = re.compile(r'^down_revision\s*(?::[^=]*)?=\s*[\(\[]([^\)\]]+)[\)\]]', re.M)
STRING_LITERAL_RE = re.compile(r'["\']([^"\']+)["\']')


def parents_of(text: str) -> list[str]:
    """Return the list of parent revision IDs declared by one migration file."""
    tup = DOWN_TUPLE_RE.search(text)
    if tup:
        return STRING_LITERAL_RE.findall(tup.group(1))
    single = DOWN_SINGLE_RE.search(text)
    if single:
        return [single.group(1)]
    return []


def main() -> int:
    if not VERSIONS.is_dir():
        print(f"ERROR: versions dir not found: {VERSIONS}", file=sys.stderr)
        return 2

    revisions: dict[str, list[str]] = {}
    for py in sorted(VERSIONS.glob("*.py")):
        text = py.read_text(encoding="utf-8")
        rev = REV_RE.search(text)
        if not rev:
            continue
        revisions[rev.group(1)] = parents_of(text)

    all_parents: set[str] = set()
    for parents in revisions.values():
        all_parents.update(parents)

    heads = sorted(r for r in revisions if r not in all_parents)

    print(f"alembic revisions={len(revisions)} heads={len(heads)}")
    for h in heads:
        print(f"  head: {h}")

    if len(heads) != 1:
        print(
            f"ERROR: expected exactly 1 alembic head, found {len(heads)}: {heads}. "
            "Re-chain the new migration(s) so the DAG stays linear, "
            "or add a merge migration whose down_revision is a tuple of the heads.",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
