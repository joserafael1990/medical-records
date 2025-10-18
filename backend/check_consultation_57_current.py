#!/usr/bin/env python3
"""
Check current state of consultation ID 57
"""

import psycopg2

def check_consultation():
    try:
        # Connect to database
        conn = psycopg2.connect(
            host='postgres-db',
            port=5432,
            database='historias_clinicas',
            user='historias_user',
            password='historias_pass'
        )
        cur = conn.cursor()
        
        print("🔍 Checking current state of consultation ID 57...")
        
        # Check if consultation exists
        cur.execute("""
            SELECT id, patient_id, doctor_id, consultation_date, prescribed_medications, treatment_plan, updated_at
            FROM medical_records 
            WHERE id = 57
        """)
        
        consultation = cur.fetchone()
        if consultation:
            print(f"✅ Consultation 57 current state:")
            print(f"  ID: {consultation[0]}")
            print(f"  Patient ID: {consultation[1]}")
            print(f"  Doctor ID: {consultation[2]}")
            print(f"  Date: {consultation[3]}")
            print(f"  Prescribed Medications: '{consultation[4]}'")
            print(f"  Treatment Plan: '{consultation[5][:50]}...' if consultation[5] else 'None'")
            print(f"  Updated At: {consultation[6]}")
        else:
            print("❌ Consultation ID 57 not found")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    check_consultation()
