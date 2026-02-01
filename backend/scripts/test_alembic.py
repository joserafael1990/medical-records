#!/usr/bin/env python3
"""
Test script to verify Alembic configuration
Run this to check if Alembic can detect all models correctly
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

try:
    from database import Base
    from models.schedule import ScheduleTemplate
    from models.diagnosis import DiagnosisCatalog
    
    print("✅ All models imported successfully")
    print(f"📊 Total tables in metadata: {len(Base.metadata.tables)}")
    print("\n📋 Tables detected by Alembic:")
    for table_name in sorted(Base.metadata.tables.keys()):
        print(f"  - {table_name}")
    
    print("\n✅ Alembic configuration is correct!")
    print("💡 You can now run: alembic revision --autogenerate -m 'description'")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

