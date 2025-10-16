#!/usr/bin/env python3
"""
Create a valid JWT token for testing
"""

from datetime import datetime, timedelta, timezone
from jose import jwt
from config_secure import JWT_SECRET_KEY as SECRET_KEY, JWT_ALGORITHM as ALGORITHM

def create_test_token(doctor_id: int = 20):
    """Create a valid JWT token for testing"""
    
    # Token data structure that matches what the auth system expects
    token_data = {
        "sub": str(doctor_id),  # Subject (user ID as string)
        "user_id": doctor_id,   # User ID as integer
        "person_type": "doctor", # Person type
        "person_code": "DOC001", # Person code
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),  # Expiration
        "iat": datetime.now(timezone.utc),  # Issued at
        "type": "access"  # Token type (required by verify_token)
    }
    
    # Create the token
    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    
    print(f"Token for doctor_id={doctor_id}: {token}")
    return token

if __name__ == "__main__":
    create_test_token(20)
