#!/usr/bin/env python3
"""
Database Setup Checker for Medical Records System
This script checks the current database setup and prepares it for the medical records system
"""

import psycopg2
import sys
from psycopg2 import sql

def check_database_connection():
    """Check if we can connect to the existing PostgreSQL container"""
    print("🔍 Checking database connection...")
    
    try:
        # Connect to the existing PostgreSQL container
        # Using the container IP we found earlier (172.17.0.2)
        conn = psycopg2.connect(
            host="172.17.0.2",  # Container IP from docker inspect
            port=5432,
            database="postgres",  # Default database
            user="postgres",
            password="mysecretpassword"
        )
        
        print("✅ Successfully connected to PostgreSQL container!")
        
        # Check if historias_clinicas database exists
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = 'historias_clinicas'")
        exists = cursor.fetchone()
        
        if exists:
            print("✅ Database 'historias_clinicas' already exists!")
        else:
            print("⚠️  Database 'historias_clinicas' does not exist. Creating it...")
            conn.autocommit = True
            cursor.execute("CREATE DATABASE historias_clinicas")
            print("✅ Database 'historias_clinicas' created successfully!")
        
        # Test connection to the medical records database
        cursor.close()
        conn.close()
        
        # Try to connect to the medical records database
        conn = psycopg2.connect(
            host="172.17.0.2",
            port=5432,
            database="historias_clinicas",
            user="postgres",
            password="mysecretpassword"
        )
        
        print("✅ Successfully connected to 'historias_clinicas' database!")
        
        # Check current tables
        cursor = conn.cursor()
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        tables = cursor.fetchall()
        
        if tables:
            print(f"📋 Found {len(tables)} existing tables:")
            for table in tables:
                print(f"   - {table[0]}")
        else:
            print("📋 No tables found - database is ready for medical records system")
        
        cursor.close()
        conn.close()
        
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Database connection failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def check_docker_network():
    """Check Docker network configuration"""
    print("\n🐳 Checking Docker network configuration...")
    
    try:
        import subprocess
        result = subprocess.run(
            ["docker", "network", "inspect", "bridge"],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("✅ Docker bridge network is available")
            
            # Extract container information
            import json
            network_info = json.loads(result.stdout)[0]
            containers = network_info.get('Containers', {})
            
            if containers:
                print(f"📋 Found {len(containers)} containers in bridge network:")
                for container_id, info in containers.items():
                    container_name = info.get('Name', 'Unknown')
                    ip_address = info.get('IPv4Address', 'Unknown')
                    print(f"   - {container_name} ({container_id[:12]}) -> {ip_address}")
            else:
                print("⚠️  No containers found in bridge network")
        else:
            print("❌ Failed to inspect Docker network")
            return False
            
    except Exception as e:
        print(f"❌ Error checking Docker network: {e}")
        return False
    
    return True

def main():
    """Main function to run all checks"""
    print("🏥 Medical Records System - Database Setup Checker")
    print("=" * 60)
    
    # Check Docker network first
    network_ok = check_docker_network()
    
    if not network_ok:
        print("\n❌ Docker network check failed. Please ensure Docker is running.")
        sys.exit(1)
    
    # Check database connection
    db_ok = check_database_connection()
    
    if not db_ok:
        print("\n❌ Database setup failed. Please check your PostgreSQL container.")
        sys.exit(1)
    
    print("\n🎉 Database setup check completed successfully!")
    print("\n📋 Summary:")
    print("   ✅ PostgreSQL container is running")
    print("   ✅ Database connection is working")
    print("   ✅ 'historias_clinicas' database is ready")
    print("   ✅ Docker networking is configured")
    
    print("\n🚀 Next Steps:")
    print("   1. Run: ./migrate-existing-db.sh")
    print("   2. Choose your preferred setup option")
    print("   3. Start the medical records system")
    
    return True

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Setup check interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error during setup check: {e}")
        sys.exit(1)
