"""
Complete list of timezones for doctor office configuration
"""

TIMEZONES = [
    # Americas
    ("America/New_York", "Eastern Time (New York)"),
    ("America/Chicago", "Central Time (Chicago)"),
    ("America/Denver", "Mountain Time (Denver)"),
    ("America/Los_Angeles", "Pacific Time (Los Angeles)"),
    ("America/Mexico_City", "Central Time (Mexico City)"),
    ("America/Tijuana", "Pacific Time (Tijuana)"),
    ("America/Cancun", "Eastern Time (Cancun)"),
    ("America/Merida", "Central Time (Merida)"),
    ("America/Monterrey", "Central Time (Monterrey)"),
    ("America/Guadalajara", "Central Time (Guadalajara)"),
    ("America/Chihuahua", "Mountain Time (Chihuahua)"),
    ("America/Hermosillo", "Mountain Time (Hermosillo)"),
    ("America/Toronto", "Eastern Time (Toronto)"),
    ("America/Vancouver", "Pacific Time (Vancouver)"),
    ("America/Sao_Paulo", "Brasilia Time (São Paulo)"),
    ("America/Buenos_Aires", "Argentina Time (Buenos Aires)"),
    ("America/Lima", "Peru Time (Lima)"),
    ("America/Bogota", "Colombia Time (Bogotá)"),
    ("America/Caracas", "Venezuela Time (Caracas)"),
    ("America/Santiago", "Chile Time (Santiago)"),
    
    # Europe
    ("Europe/London", "Greenwich Mean Time (London)"),
    ("Europe/Paris", "Central European Time (Paris)"),
    ("Europe/Madrid", "Central European Time (Madrid)"),
    ("Europe/Berlin", "Central European Time (Berlin)"),
    ("Europe/Rome", "Central European Time (Rome)"),
    ("Europe/Amsterdam", "Central European Time (Amsterdam)"),
    ("Europe/Brussels", "Central European Time (Brussels)"),
    ("Europe/Zurich", "Central European Time (Zurich)"),
    ("Europe/Vienna", "Central European Time (Vienna)"),
    ("Europe/Prague", "Central European Time (Prague)"),
    ("Europe/Warsaw", "Central European Time (Warsaw)"),
    ("Europe/Stockholm", "Central European Time (Stockholm)"),
    ("Europe/Oslo", "Central European Time (Oslo)"),
    ("Europe/Copenhagen", "Central European Time (Copenhagen)"),
    ("Europe/Helsinki", "Eastern European Time (Helsinki)"),
    ("Europe/Athens", "Eastern European Time (Athens)"),
    ("Europe/Istanbul", "Turkey Time (Istanbul)"),
    ("Europe/Moscow", "Moscow Time (Moscow)"),
    
    # Asia
    ("Asia/Tokyo", "Japan Standard Time (Tokyo)"),
    ("Asia/Shanghai", "China Standard Time (Shanghai)"),
    ("Asia/Hong_Kong", "Hong Kong Time (Hong Kong)"),
    ("Asia/Singapore", "Singapore Time (Singapore)"),
    ("Asia/Seoul", "Korea Standard Time (Seoul)"),
    ("Asia/Bangkok", "Indochina Time (Bangkok)"),
    ("Asia/Jakarta", "Western Indonesia Time (Jakarta)"),
    ("Asia/Manila", "Philippine Time (Manila)"),
    ("Asia/Kuala_Lumpur", "Malaysia Time (Kuala Lumpur)"),
    ("Asia/Taipei", "Taiwan Time (Taipei)"),
    ("Asia/Kolkata", "India Standard Time (Mumbai/Delhi)"),
    ("Asia/Karachi", "Pakistan Standard Time (Karachi)"),
    ("Asia/Dhaka", "Bangladesh Standard Time (Dhaka)"),
    ("Asia/Dubai", "Gulf Standard Time (Dubai)"),
    ("Asia/Tehran", "Iran Standard Time (Tehran)"),
    ("Asia/Jerusalem", "Israel Standard Time (Jerusalem)"),
    
    # Oceania
    ("Australia/Sydney", "Australian Eastern Time (Sydney)"),
    ("Australia/Melbourne", "Australian Eastern Time (Melbourne)"),
    ("Australia/Brisbane", "Australian Eastern Time (Brisbane)"),
    ("Australia/Perth", "Australian Western Time (Perth)"),
    ("Pacific/Auckland", "New Zealand Standard Time (Auckland)"),
    ("Pacific/Fiji", "Fiji Time (Suva)"),
    ("Pacific/Honolulu", "Hawaii-Aleutian Time (Honolulu)"),
    
    # Africa
    ("Africa/Cairo", "Eastern European Time (Cairo)"),
    ("Africa/Johannesburg", "South Africa Standard Time (Johannesburg)"),
    ("Africa/Lagos", "West Africa Time (Lagos)"),
    ("Africa/Casablanca", "Western European Time (Casablanca)"),
    ("Africa/Nairobi", "East Africa Time (Nairobi)"),
]

def get_timezone_options():
    """Return timezone options formatted for dropdown"""
    return [(tz[0], f"{tz[1]} ({tz[0]})") for tz in TIMEZONES]


