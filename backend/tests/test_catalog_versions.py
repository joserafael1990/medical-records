"""
Integrity checks for core medical catalogs.
"""

from __future__ import annotations

from sqlalchemy import text

from catalog_metadata import CATALOG_METADATA
from database import SessionLocal


def test_catalog_integrity():
    """
    Ensure critical catalogs have the expected data, structure, and metadata.
    """
    db = SessionLocal()
    try:
        for table_name, metadata in CATALOG_METADATA.items():
            version = metadata.get("version")
            assert version, f"Catalog '{table_name}' must declare a version string"

            count = db.execute(text(f"SELECT COUNT(*) FROM {table_name}")).scalar()
            assert count >= metadata["min_records"], (
                f"Catalog '{table_name}' has {count} records, expected at least "
                f"{metadata['min_records']}"
            )

            expected_count = metadata.get("expected_count")
            if expected_count:
                assert count >= expected_count, (
                    f"Catalog '{table_name}' should contain at least {expected_count} records"
                )

            required_columns = metadata.get("required_columns", [])
            for column in required_columns:
                null_count = db.execute(
                    text(
                        f"""
                        SELECT COUNT(*) FROM {table_name}
                        WHERE {column} IS NULL OR TRIM(CAST({column} AS TEXT)) = ''
                        """
                    )
                ).scalar()
                assert null_count == 0, (
                    f"Catalog '{table_name}' contains {null_count} rows with empty '{column}'"
                )
    finally:
        db.close()

