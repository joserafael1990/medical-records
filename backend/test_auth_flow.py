#!/usr/bin/env python3
"""
Test the complete authentication flow and medical record creation
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api"

def test_complete_flow():
    """Test the complete flow: login -> create medical record with laboratory_analysis"""
    
    print("🧪 Testing complete authentication and medical record creation flow...")
    
    # Step 1: Login
    print("\n1️⃣ Testing login...")
    login_data = {
        "email": "doctor@test.com",  # Existing doctor user
        "password": "password123"  # Common test password
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/auth/login",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"📡 Login response status: {response.status_code}")
        print(f"📡 Login response: {response.text}")
        
        if response.status_code != 200:
            print("❌ Login failed!")
            return False
            
        login_result = response.json()
        token = login_result.get("access_token")
        
        if not token:
            print("❌ No access token received!")
            return False
            
        print("✅ Login successful!")
        print(f"🔑 Token preview: {token[:20]}...")
        
    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        return False
    
    # Step 2: Create medical record with laboratory_analysis
    print("\n2️⃣ Testing medical record creation with laboratory_analysis...")
    
    test_data = {
        "patient_id": 1,
        "doctor_id": 1,
        "consultation_date": datetime.now().isoformat(),
        "chief_complaint": "Test consultation with laboratory analysis",
        "history_present_illness": "Patient reports test symptoms",
        "family_history": "No significant family history",
        "personal_pathological_history": "No significant history",
        "personal_non_pathological_history": "Regular exercise",
        "physical_examination": "Patient in good general condition",
        "laboratory_analysis": "Hemoglobina: 14.2 g/dL, Glucosa: 95 mg/dL, Colesterol total: 180 mg/dL",
        "primary_diagnosis": "Test diagnosis",
        "treatment_plan": "Test treatment plan",
        "follow_up_instructions": "Return in one week",
        "prognosis": "Good"
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/medical-records",
            json=test_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}"
            }
        )
        
        print(f"📡 Medical record creation response status: {response.status_code}")
        print(f"📡 Medical record creation response: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Medical record created successfully!")
            
            # Verify laboratory_analysis was saved
            if 'data' in result:
                saved_data = result['data']
                saved_lab_analysis = saved_data.get('laboratory_analysis')
                print(f"🔬 Saved laboratory_analysis: {saved_lab_analysis}")
                
                if saved_lab_analysis == test_data['laboratory_analysis']:
                    print("✅ laboratory_analysis field saved correctly!")
                    return True
                else:
                    print("❌ laboratory_analysis field was not saved correctly!")
                    return False
            else:
                print("❌ No data returned in response")
                return False
        else:
            print(f"❌ Failed to create medical record: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Medical record creation error: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_complete_flow()
    if success:
        print("\n🎉 Complete flow test passed! laboratory_analysis field is working correctly.")
    else:
        print("\n💥 Complete flow test failed!")
