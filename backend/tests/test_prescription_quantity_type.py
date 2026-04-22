"""Regression test: ConsultationPrescription.quantity must accept free text.

Mexican prescriptions routinely carry quantities like "30 tabletas", "1
caja", "150 ml". On 2026-04-21 the quantity column was Integer and every
non-numeric POST surfaced as InvalidTextRepresentation. The column was
widened to VARCHAR(100) in migration e7f8a9b0c1d2; this test pins the
model type so a future autogenerate pass can't quietly revert it.
"""
from sqlalchemy import String


def test_quantity_column_is_string():
    from models.medical import ConsultationPrescription

    col = ConsultationPrescription.__table__.c.quantity
    assert isinstance(col.type, String), (
        f"quantity must be String (got {type(col.type).__name__}); "
        "see migration e7f8a9b0c1d2 for the rationale"
    )
    assert col.type.length == 100
