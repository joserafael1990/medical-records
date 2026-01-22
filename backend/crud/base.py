from datetime import datetime
import bcrypt
import pytz

# CDMX Timezone configuration
CDMX_TZ = pytz.timezone('America/Mexico_City')

def get_cdmx_now() -> datetime:
    """Get current datetime in CDMX timezone"""
    return datetime.now(CDMX_TZ)

def to_utc_for_storage(dt: datetime) -> datetime:
    """Convert datetime to UTC for database storage"""
    if dt.tzinfo is None:
        # Assume CDMX if naive
        dt = CDMX_TZ.localize(dt)
    return dt.astimezone(pytz.utc)

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

# ============================================================================
# PHONE NUMBER HELPERS
# ============================================================================

def parse_phone_with_country_code(phone: str) -> dict:
    """
    Parse a phone number to extract country code and number
    Returns: {country_code: str, number: str}
    """
    if not phone:
        return {'country_code': '+52', 'number': ''}
    
    phone = phone.strip()
    
    # Common country codes (sorted by length descending to match longest first)
    country_codes = [
        '+593', '+595', '+598', '+591', '+592', '+597', '+594', '+596',
        '+502', '+503', '+504', '+505', '+506', '+507', '+509', '+501',
        '+971', '+972', '+973', '+974', '+975', '+976', '+977', '+992',
        '+993', '+994', '+995', '+996', '+998',
        '+52', '+54', '+55', '+56', '+57', '+58',
        '+1', '+7', '+20', '+27', '+30', '+31', '+32', '+33', '+34', 
        '+36', '+39', '+40', '+41', '+43', '+44', '+45', '+46', '+47',
        '+48', '+49', '+51', '+60', '+61', '+62', '+63', '+64', '+65',
        '+66', '+81', '+82', '+84', '+86', '+90', '+91', '+92', '+93',
        '+94', '+95', '+98'
    ]
    
    # Sort by length descending to match longest codes first
    country_codes.sort(key=len, reverse=True)
    
    for code in country_codes:
        if phone.startswith(code):
            return {
                'country_code': code,
                'number': phone[len(code):].strip()
            }
    
    # Default to Mexico if no code found
    return {'country_code': '+52', 'number': phone}

def build_phone(country_code: str, number: str) -> str:
    """Build full phone number from country code and number"""
    if not number:
        return ''
    country_code = country_code.strip() if country_code else '+52'
    number = number.strip().replace(' ', '').replace('-', '')
    return f"{country_code}{number}"
