#!/usr/bin/env python3
"""
Test script to verify that laboratory_analysis field is being saved correctly
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api"

def test_laboratory_analysis_saving():
    """Test that laboratory_analysis field is saved correctly"""
    
    # Test data
    test_data = {
        "patient_id": 1,  # Assuming patient with ID 1 exists
        "doctor_id": 1,   # Assuming doctor with ID 1 exists
        "consultation_date": datetime.now().isoformat(),
        "chief_complaint": "Dolor de cabeza",
        "history_present_illness": "Paciente refiere dolor de cabeza desde hace 2 días",
        "family_history": "Madre con diabetes",
        "personal_pathological_history": "Ninguna",
        "personal_non_pathological_history": "Ejercicio regular",
        "physical_examination": "Paciente en buenas condiciones generales",
        "laboratory_analysis": "Hemoglobina: 14.2 g/dL, Glucosa: 95 mg/dL, Colesterol total: 180 mg/dL",
        "primary_diagnosis": "Cefalea tensional",
        "treatment_plan": "Analgésicos y relajación",
        "follow_up_instructions": "Regresar en una semana",
        "prognosis": "Bueno"
    }
    
    print("🧪 Testing laboratory_analysis field saving...")
    print(f"📝 Test data: {json.dumps(test_data, indent=2)}")
    
    try:
        # Make request to create medical record
        response = requests.post(
            f"{API_BASE}/medical-records",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"📡 Response status: {response.status_code}")
        print(f"📡 Response body: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Medical record created successfully!")
            print(f"📋 Record ID: {result.get('data', {}).get('id')}")
            
            # Verify the laboratory_analysis field was saved
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
            print(f"❌ Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error during test: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_laboratory_analysis_saving()
    if success:
        print("\n🎉 Test passed! laboratory_analysis field is working correctly.")
    else:
        print("\n💥 Test failed! laboratory_analysis field is not working correctly.")

