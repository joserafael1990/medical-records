#!/usr/bin/env python3
"""
Test script to verify prescribed_medications field is being saved correctly
"""

import psycopg2
import json
from datetime import datetime

def test_prescribed_medications():
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
        
        print("🔍 Testing prescribed_medications field in medical_records table...")
        
        # Check if the field exists
        cur.execute("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'medical_records' 
            AND column_name = 'prescribed_medications'
        """)
        
        field_info = cur.fetchone()
        if field_info:
            print(f"✅ Field exists: {field_info[0]} ({field_info[1]}, nullable: {field_info[2]})")
        else:
            print("❌ Field 'prescribed_medications' does not exist in medical_records table")
            return
        
        # Check recent records
        cur.execute("""
            SELECT id, patient_id, doctor_id, consultation_date, prescribed_medications, treatment_plan
            FROM medical_records 
            ORDER BY created_at DESC 
            LIMIT 5
        """)
        
        records = cur.fetchall()
        print(f"\n📊 Recent medical records (last 5):")
        for record in records:
            print(f"  ID: {record[0]}, Patient: {record[1]}, Doctor: {record[2]}")
            print(f"    Date: {record[3]}")
            print(f"    Prescribed Medications: '{record[4]}'")
            print(f"    Treatment Plan: '{record[5][:50]}...' if record[5] else 'None'")
            print()
        
        # Check if any records have prescribed_medications data
        cur.execute("""
            SELECT COUNT(*) 
            FROM medical_records 
            WHERE prescribed_medications IS NOT NULL 
            AND prescribed_medications != ''
        """)
        
        count = cur.fetchone()[0]
        print(f"📈 Records with prescribed_medications data: {count}")
        
        cur.close()
        conn.close()
        
        print("✅ Database test completed successfully")
        
    except Exception as e:
        print(f"❌ Error testing database: {str(e)}")

if __name__ == "__main__":
    test_prescribed_medications()
