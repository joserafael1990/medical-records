"""
Reference metadata for core medical catalogs.
Compliance: NOM-004-SSA3-2012, NOM-024-SSA3-2012 - Official catalogs for medical records
"""

from __future__ import annotations

CATALOG_METADATA = {
    "diagnosis_catalog": {
        "name": "CIE-10 Diagnósticos",
        "version": "ICD-10-MX-2023",
        "official_source": "DGIS/CEMECE - Secretaría de Salud",
        "norm_reference": "NOM-004-SSA3-2012, NOM-024-SSA3-2012",
        "min_records": 200,
        "expected_count": 202,
        "required_columns": ["code", "name"],
        "compliance_required": True,
        "validation_enabled": True,
        "note": "Cuando se selecciona del catálogo, se valida código CIE-10 y se guarda formato: 'CIE-10: [código] - [descripción]'. La versión debe verificarse periódicamente contra la versión oficial vigente de DGIS/CEMECE.",
    },
    "study_catalog": {
        "name": "Catálogo Estudios Clínicos",
        "version": "LOINC-MX-2023",
        "official_source": "LOINC (opcional) - Regenstrief Institute",
        "norm_reference": "NOM-024-SSA3-2012",
        "min_records": 250,
        "expected_count": 275,
        "required_columns": ["name"],
        "compliance_required": False,
        "validation_enabled": False,
        "note": "Los estudios clínicos pueden ser personalizados (solo nombre) o usar catálogo LOINC opcionalmente. Cuando se use LOINC, se debe registrar código + descripción. Actualmente el sistema permite estudios personalizados.",
    },
    "medications": {
        "name": "Catálogo Medicamentos Base",
        "version": "MEDS-MX-2024",
        "official_source": "Consejo de Salubridad General - Cuadro Básico y Catálogo de Medicamentos",
        "norm_reference": "NOM-024-SSA3-2012",
        "min_records": 350,
        "expected_count": 404,
        "required_columns": ["name"],
        "compliance_required": False,
        "validation_enabled": False,
        "note": "Los medicamentos pueden ser personalizados por doctor (solo nombre) o usar catálogo oficial opcionalmente.",
    },
}


def get_catalog_version(table_name: str) -> str:
    """
    Return the registered version string for the given catalog table.
    """
    catalog_info = CATALOG_METADATA.get(table_name)
    if not catalog_info:
        raise KeyError(f"No catalog metadata registered for '{table_name}'")
    return catalog_info["version"]

