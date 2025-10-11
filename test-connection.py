#!/usr/bin/env python3
"""
Test script to verify database connection and backend setup
"""

import psycopg2
import requests
import time

def test_database_connection():
    """Test database connection"""
    print("🔍 Testing database connection...")
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            database="historias_clinicas",
            user="postgres",
            password="mysecretpassword"
        )
        cursor = conn.cursor()
        cursor.execute("SELECT 1;")
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if result[0] == 1:
            print("✅ Database connection successful!")
            return True
        else:
            print("❌ Database connection failed - unexpected result")
            return False
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def test_backend_connection():
    """Test backend API connection"""
    print("🔍 Testing backend API connection...")
    max_attempts = 10
    for attempt in range(max_attempts):
        try:
            response = requests.get("http://localhost:8000/health", timeout=5)
            if response.status_code == 200:
                print("✅ Backend API is responding!")
                print(f"   Response: {response.json()}")
                return True
        except requests.exceptions.RequestException as e:
            print(f"   Attempt {attempt + 1}/{max_attempts}: {e}")
            if attempt < max_attempts - 1:
                time.sleep(2)
    
    print("❌ Backend API is not responding")
    return False

def test_frontend_connection():
    """Test frontend connection"""
    print("🔍 Testing frontend connection...")
    max_attempts = 10
    for attempt in range(max_attempts):
        try:
            response = requests.get("http://localhost:3000", timeout=5)
            if response.status_code == 200:
                print("✅ Frontend is responding!")
                return True
        except requests.exceptions.RequestException as e:
            print(f"   Attempt {attempt + 1}/{max_attempts}: {e}")
            if attempt < max_attempts - 1:
                time.sleep(2)
    
    print("❌ Frontend is not responding")
    return False

def main():
    """Main test function"""
    print("🏥 Medical Records System - Connection Test")
    print("=" * 50)
    
    # Test database
    db_ok = test_database_connection()
    
    # Test backend
    backend_ok = test_backend_connection()
    
    # Test frontend
    frontend_ok = test_frontend_connection()
    
    print("\n📋 Test Results:")
    print("=" * 20)
    print(f"Database: {'✅ OK' if db_ok else '❌ FAILED'}")
    print(f"Backend:  {'✅ OK' if backend_ok else '❌ FAILED'}")
    print(f"Frontend: {'✅ OK' if frontend_ok else '❌ FAILED'}")
    
    if db_ok and backend_ok and frontend_ok:
        print("\n🎉 All systems are operational!")
        print("\n🌐 Access URLs:")
        print("   - Frontend: http://localhost:3000")
        print("   - Backend API: http://localhost:8000")
        print("   - API Documentation: http://localhost:8000/docs")
    else:
        print("\n⚠️  Some services are not responding. Check the logs above.")
        
        if not db_ok:
            print("   - Check if PostgreSQL container is running")
        if not backend_ok:
            print("   - Check if backend server started properly")
            print("   - Check database connection configuration")
        if not frontend_ok:
            print("   - Check if frontend development server started")

if __name__ == "__main__":
    main()

