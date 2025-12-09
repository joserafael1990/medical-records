#!/usr/bin/env python3
"""
Verify which database the application is connected to.
This helps confirm you're using Azure DB and not Digital Ocean.
"""
import os
import sys
from urllib.parse import urlparse

# Add backend to path
backend_dir = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, backend_dir)

try:
    from models.base import DATABASE_URL
    import sqlalchemy as sa
    from sqlalchemy import create_engine, text
    
    print("=" * 70)
    print("DATABASE CONNECTION VERIFICATION")
    print("=" * 70)
    print()
    
    # Parse the DATABASE_URL
    parsed = urlparse(DATABASE_URL)
    
    print("📊 Connection Details:")
    print(f"   Host: {parsed.hostname}")
    print(f"   Port: {parsed.port or 5432}")
    print(f"   Database: {parsed.path.lstrip('/')}")
    print(f"   User: {parsed.username}")
    print()
    
    # Identify database provider
    hostname = parsed.hostname or ""
    
    if "database.azure.com" in hostname.lower() or "azure" in hostname.lower():
        print("✅ DATABASE PROVIDER: Azure PostgreSQL")
        print("   ✓ You are using Azure database")
    elif "digitalocean.com" in hostname.lower() or "db.ondigitalocean.com" in hostname.lower():
        print("⚠️  DATABASE PROVIDER: Digital Ocean")
        print("   ⚠️  You are using Digital Ocean database (old)")
    elif "localhost" in hostname or "127.0.0.1" in hostname or "postgres-db" in hostname:
        print("ℹ️  DATABASE PROVIDER: Local/Docker")
        print("   ℹ️  You are using local database")
    else:
        print("❓ DATABASE PROVIDER: Unknown")
        print(f"   Hostname: {hostname}")
    print()
    
    # Try to connect and get database info
    print("🔌 Testing connection...")
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as conn:
            # Get PostgreSQL version
            result = conn.execute(text("SELECT version()"))
            version = result.scalar()
            print(f"   ✅ Connected successfully!")
            print(f"   PostgreSQL Version: {version.split(',')[0]}")
            print()
            
            # Get current database name
            result = conn.execute(text("SELECT current_database()"))
            db_name = result.scalar()
            print(f"   Current Database: {db_name}")
            
            # Get server hostname (if available)
            try:
                result = conn.execute(text("SELECT inet_server_addr(), inet_server_port()"))
                row = result.fetchone()
                if row and row[0]:
                    print(f"   Server IP: {row[0]}:{row[1]}")
            except Exception:
                pass
            
            # Check if appointment_reminders table exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = 'appointment_reminders'
                )
            """))
            table_exists = result.scalar()
            print(f"   appointment_reminders table: {'✅ EXISTS' if table_exists else '❌ MISSING'}")
            
    except Exception as e:
        print(f"   ❌ Connection failed: {e}")
        sys.exit(1)
    
    print()
    print("=" * 70)
    print("✅ Verification complete!")
    print("=" * 70)
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
