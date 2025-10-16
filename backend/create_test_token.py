#!/usr/bin/env python3

import jwt
import datetime

# Secret key (same as in your backend)
SECRET_KEY = "your-secret-key-here"

# Create token for doctor_id = 20
payload = {
    "sub": "20",  # doctor_id
    "username": "drtest",
    "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
}

token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
print(f"Token for doctor_id=20: {token}")
