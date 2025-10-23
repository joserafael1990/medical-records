"""
Security Configuration for File Uploads
Configuración de seguridad para carga de archivos
"""

# File upload security settings
FILE_UPLOAD_SECURITY = {
    # Maximum file size (10MB)
    "MAX_FILE_SIZE": 10 * 1024 * 1024,  # 10MB in bytes
    
    # Ultra-restrictive: Only PDF and basic images allowed
    "ALLOWED_EXTENSIONS": {
        '.pdf', '.jpg', '.jpeg', '.png'
    },
    
    # Allowed MIME types (must match extensions)
    "ALLOWED_MIME_TYPES": {
        'application/pdf',
        'image/jpeg', 'image/jpg', 'image/png'
    },
    
    # Dangerous file patterns to block
    "DANGEROUS_PATTERNS": [
        # Executables
        '.exe', '.bat', '.cmd', '.com', '.scr', '.pif',
        # Scripts
        '.vbs', '.js', '.jar', '.php', '.asp', '.jsp', '.py', '.rb', '.pl',
        # Shell scripts
        '.sh', '.ps1', '.cgi',
        # System files
        '.htaccess', '.htpasswd', '.ini', '.conf',
        # Archives (potential for zip bombs)
        '.zip', '.rar', '.7z', '.tar', '.gz'
    ],
    
    # Security headers for file downloads
    "SECURITY_HEADERS": {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Content-Security-Policy': "default-src 'self'"
    }
}

# Security recommendations for production
SECURITY_RECOMMENDATIONS = {
    "file_scanning": "Consider implementing virus scanning for uploaded files",
    "content_validation": "Validate file content matches declared type",
    "quarantine": "Store files in isolated directory with restricted permissions",
    "monitoring": "Log all file upload attempts for security monitoring",
    "backup": "Regular backups of uploaded files with integrity checks"
}
