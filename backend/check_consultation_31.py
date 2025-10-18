#!/usr/bin/env python3
"""
Check if consultation ID 31 exists and has prescribed_medications data
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
        
        print("🔍 Checking consultation ID 31...")
        
        # Check if consultation exists
        cur.execute("""
            SELECT id, patient_id, doctor_id, consultation_date, prescribed_medications, treatment_plan
            FROM medical_records 
            WHERE id = 31
        """)
        
        consultation = cur.fetchone()
        if consultation:
            print(f"✅ Consultation 31 found:")
            print(f"  ID: {consultation[0]}")
            print(f"  Patient ID: {consultation[1]}")
            print(f"  Doctor ID: {consultation[2]}")
            print(f"  Date: {consultation[3]}")
            print(f"  Prescribed Medications: '{consultation[4]}'")
            print(f"  Treatment Plan: '{consultation[5][:50]}...' if consultation[5] else 'None'")
        else:
            print("❌ Consultation ID 31 not found")
        
        # Check recent consultations
        cur.execute("""
            SELECT id, patient_id, doctor_id, consultation_date, prescribed_medications
            FROM medical_records 
            ORDER BY created_at DESC 
            LIMIT 3
        """)
        
        recent = cur.fetchall()
        print(f"\n📊 Recent consultations (last 3):")
        for record in recent:
            print(f"  ID: {record[0]}, Patient: {record[1]}, Doctor: {record[2]}")
            print(f"    Date: {record[3]}")
            print(f"    Prescribed Medications: '{record[4]}'")
            print()
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    check_consultation()
