from typing import Optional
import logging

logger = logging.getLogger(__name__)

def _format_phone_number_generic(phone: str, country_code: Optional[str]) -> str:
    """Formatea número a E.164 simple. Devuelve con prefijo +.
    - Si phone inicia con +, se respeta y se normaliza
    - Si tiene 10 dígitos y hay country_code, se antepone
    - Remueve espacios, guiones y paréntesis
    - Corrige formatos comunes incorrectos (ej: +521... -> +52...)
    """
    if not phone:
        return phone
    clean = phone.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
    
    # Si inicia con +, verificar y corregir formatos comunes incorrectos
    if clean.startswith('+'):
        # Corregir formato común incorrecto: +521... (México) -> +52...
        # El código de país de México es 52, no 521
        # Ejemplo: +5215579449672 -> +525579449672
        if clean.startswith('+521') and len(clean) >= 13:  # +521 + al menos 10 dígitos
            # Remover el 1 extra: +5215579449672 -> +525579449672
            # Extraer los últimos 10 dígitos después de +521
            digits_after_521 = clean[4:]  # Todo después de '+521'
            if len(digits_after_521) == 10:
                corrected = '+52' + digits_after_521  # +52 + 10 dígitos
                logger.warning(f"⚠️ Corrected phone format: {clean} -> {corrected} (removed extra '1' in country code)")
                return corrected
        return clean
    
    if country_code:
        cc = country_code if not country_code.startswith('+') else country_code[1:]
        # Si el número ya inicia con el código de país, devolverlo con +
        if clean.startswith(cc):
            return f"+{clean}"
        # Si el número tiene 10 dígitos, agregar código de país
        if len(clean) == 10:
            return f"+{cc}{clean}"
        return f"+{clean}"
    # fallback México
    if len(clean) == 10:
        return f"+52{clean}"
    return f"+{clean}"
