#!/usr/bin/env python3
"""
Check authentication status by testing a simple endpoint
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api"

def check_auth_status():
    """Check if the API is accessible and what the auth status is"""
    
    print("🔍 Checking authentication status...")
    
    try:
        # Test a simple endpoint that doesn't require auth
        response = requests.get(f"{BASE_URL}/docs")
        print(f"📡 Docs endpoint status: {response.status_code}")
        
        # Test an endpoint that requires auth
        response = requests.get(f"{API_BASE}/doctors/me/profile")
        print(f"📡 Profile endpoint status: {response.status_code}")
        print(f"📡 Profile response: {response.text}")
        
        # Test medical records endpoint
        response = requests.get(f"{API_BASE}/medical-records")
        print(f"📡 Medical records endpoint status: {response.status_code}")
        print(f"📡 Medical records response: {response.text}")
        
    except Exception as e:
        print(f"❌ Error during auth check: {str(e)}")

if __name__ == "__main__":
    check_auth_status()

