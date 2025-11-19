"""
Document Validators - Conditional validation based on document type
Validaciones condicionales de documentos según el tipo seleccionado
Compliance: NOM-004-SSA3-2012, NOM-024-SSA3-2012
"""

import re
from typing import Optional, Dict, Any, List, Tuple
from logger import get_logger

api_logger = get_logger("api")

# Document IDs from database (from add_document_types_and_update_specialties.sql)
CURP_DOCUMENT_ID = 5  # Document ID for "CURP" (Personal)
PROFESSIONAL_LICENSE_DOCUMENT_ID = 13  # Document ID for "Cédula Profesional" (Professional)

# Document names for validation (case-insensitive matching)
CURP_DOCUMENT_NAME = "CURP"
PROFESSIONAL_LICENSE_DOCUMENT_NAME = "Cédula Profesional"


def validate_curp_format(curp: str) -> Tuple[bool, Optional[str]]:
    """
    Valida formato CURP mexicano
    Formato: 18 caracteres alfanuméricos
    Estructura: 4 letras + 6 dígitos fecha + 1 letra género + 2 letras estado + 3 alfanum + 1 dígito/letra
    
    Args:
        curp: CURP a validar
        
    Returns:
        tuple: (es_válido, mensaje_error)
    """
    if not curp:
        return False, "CURP no puede estar vacío"
    
    curp_upper = curp.upper().strip()
    
    # Validar longitud
    if len(curp_upper) != 18:
        return False, f"CURP debe tener exactamente 18 caracteres (tiene {len(curp_upper)})"
    
    # Estructura: 4 letras + 6 dígitos + 1 letra + 2 letras + 3 alfanum + 1 dígito/letra
    # Ejemplo: ABCD850315HDFXXX01
    pattern = r'^[A-Z]{4}\d{6}[HM][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d$'
    
    if not re.match(pattern, curp_upper):
        return False, "CURP no tiene un formato válido. Debe seguir el formato: 4 letras + 6 dígitos + 1 letra + 2 letras + 3 alfanuméricos + 1 dígito/letra + 1 dígito"
    
    # Validar que la fecha sea válida (primeros 6 dígitos: AAMMDD)
    try:
        year_prefix = curp_upper[4:6]  # Años 00-99
        month = curp_upper[6:8]  # Mes 01-12
        day = curp_upper[8:10]  # Día 01-31
        
        month_int = int(month)
        day_int = int(day)
        
        if month_int < 1 or month_int > 12:
            return False, "CURP: El mes debe estar entre 01 y 12"
        
        if day_int < 1 or day_int > 31:
            return False, "CURP: El día debe estar entre 01 y 31"
    except (ValueError, IndexError):
        return False, "CURP: Fecha de nacimiento inválida"
    
    return True, None


def validate_professional_license_format(license: str) -> Tuple[bool, Optional[str]]:
    """
    Valida formato de cédula profesional mexicana
    Formato: Máximo 8 dígitos numéricos
    
    Args:
        license: Número de cédula profesional
        
    Returns:
        tuple: (es_válido, mensaje_error)
    """
    if not license:
        return False, "Cédula profesional no puede estar vacía"
    
    license_clean = license.strip()
    
    # Validar longitud máxima
    if len(license_clean) > 8:
        return False, f"Cédula profesional no puede tener más de 8 dígitos (tiene {len(license_clean)})"
    
    # Validar que sean solo dígitos
    if not license_clean.isdigit():
        return False, "Cédula profesional solo puede contener dígitos numéricos"
    
    # Validar longitud mínima (normalmente 7 u 8 dígitos, pero permitimos desde 1 para flexibilidad)
    if len(license_clean) < 1:
        return False, "Cédula profesional no puede estar vacía"
    
    return True, None


def get_document_id_by_name(document_name: str, documents: List[Dict[str, Any]]) -> Optional[int]:
    """
    Obtiene el ID de un documento por su nombre
    
    Args:
        document_name: Nombre del documento a buscar
        documents: Lista de documentos disponibles (con 'id' y 'name')
        
    Returns:
        ID del documento o None si no se encuentra
    """
    document_name_lower = document_name.lower().strip()
    for doc in documents:
        if doc.get('name', '').lower() == document_name_lower:
            return doc.get('id')
    return None


def validate_curp_conditional(
    documents: List[Dict[str, Any]],
    document_id: Optional[int] = None,
    document_name: Optional[str] = None,
    document_value: Optional[str] = None
) -> Tuple[bool, Optional[str]]:
    """
    Valida CURP condicionalmente: solo si el documento personal seleccionado es CURP
    
    Args:
        documents: Lista de documentos personales del paciente/doctor
        document_id: ID del documento seleccionado (si se proporciona directamente)
        document_name: Nombre del documento seleccionado (alternativa)
        document_value: Valor del documento (CURP a validar)
        
    Returns:
        tuple: (es_válido, mensaje_error)
    """
    # Si no hay documentos, no hay nada que validar
    if not documents or len(documents) == 0:
        return True, None
    
    # Si se proporciona document_id, buscar el documento
    if document_id:
        curp_doc = next((doc for doc in documents if doc.get('document_id') == document_id), None)
        if not curp_doc:
            # Documento no encontrado en la lista - asumir que no es CURP
            return True, None
        
        # Si el documento no es CURP, no validar
        if document_id != CURP_DOCUMENT_ID:
            return True, None
        
        # Si es CURP, validar el formato
        curp_value = curp_doc.get('document_value') or document_value
        if not curp_value:
            return False, "CURP es requerido cuando se selecciona documento personal CURP"
        
        return validate_curp_format(curp_value)
    
    # Si se proporciona document_name, buscar por nombre
    if document_name:
        document_name_lower = document_name.lower().strip()
        if document_name_lower != CURP_DOCUMENT_NAME.lower():
            # No es CURP, no validar
            return True, None
        
        # Es CURP, validar el formato
        if not document_value:
            return False, "CURP es requerido cuando se selecciona documento personal CURP"
        
        return validate_curp_format(document_value)
    
    # Si no se proporciona ni document_id ni document_name, buscar CURP en la lista
    curp_doc = next((doc for doc in documents if doc.get('document_id') == CURP_DOCUMENT_ID), None)
    if not curp_doc:
        # No hay CURP en la lista, no validar
        return True, None
    
    # Hay CURP en la lista, validar
    curp_value = curp_doc.get('document_value') or document_value
    if not curp_value:
        return False, "CURP es requerido cuando se selecciona documento personal CURP"
    
    return validate_curp_format(curp_value)


def validate_professional_license_conditional(
    documents: List[Dict[str, Any]],
    document_id: Optional[int] = None,
    document_name: Optional[str] = None,
    document_value: Optional[str] = None
) -> Tuple[bool, Optional[str]]:
    """
    Valida cédula profesional condicionalmente: solo si el documento profesional seleccionado es "Cédula Profesional"
    
    Args:
        documents: Lista de documentos profesionales del doctor
        document_id: ID del documento seleccionado (si se proporciona directamente)
        document_name: Nombre del documento seleccionado (alternativa)
        document_value: Valor del documento (cédula a validar)
        
    Returns:
        tuple: (es_válido, mensaje_error)
    """
    # Si no hay documentos, no hay nada que validar
    if not documents or len(documents) == 0:
        return True, None
    
    # Si se proporciona document_id, buscar el documento
    if document_id:
        license_doc = next((doc for doc in documents if doc.get('document_id') == document_id), None)
        if not license_doc:
            # Documento no encontrado en la lista - asumir que no es Cédula Profesional
            return True, None
        
        # Si el documento no es Cédula Profesional, no validar
        if document_id != PROFESSIONAL_LICENSE_DOCUMENT_ID:
            return True, None
        
        # Si es Cédula Profesional, validar el formato
        license_value = license_doc.get('document_value') or document_value
        if not license_value:
            return False, "Cédula profesional es requerida cuando se selecciona documento profesional 'Cédula Profesional'"
        
        return validate_professional_license_format(license_value)
    
    # Si se proporciona document_name, buscar por nombre
    if document_name:
        document_name_lower = document_name.lower().strip()
        if document_name_lower != PROFESSIONAL_LICENSE_DOCUMENT_NAME.lower():
            # No es Cédula Profesional, no validar
            return True, None
        
        # Es Cédula Profesional, validar el formato
        if not document_value:
            return False, "Cédula profesional es requerida cuando se selecciona documento profesional 'Cédula Profesional'"
        
        return validate_professional_license_format(document_value)
    
    # Si no se proporciona ni document_id ni document_name, buscar Cédula Profesional en la lista
    license_doc = next((doc for doc in documents if doc.get('document_id') == PROFESSIONAL_LICENSE_DOCUMENT_ID), None)
    if not license_doc:
        # No hay Cédula Profesional en la lista, no validar
        return True, None
    
    # Hay Cédula Profesional en la lista, validar
    license_value = license_doc.get('document_value') or document_value
    if not license_value:
        return False, "Cédula profesional es requerida cuando se selecciona documento profesional 'Cédula Profesional'"
    
    return validate_professional_license_format(license_value)

