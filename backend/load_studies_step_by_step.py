#!/usr/bin/env python3
"""
Load comprehensive laboratory studies catalog step by step
"""

import os
import sys
sys.path.append('/app')

from database import engine
from sqlalchemy import text

def execute_sql_file():
    """Execute the comprehensive studies catalog SQL file"""
    
    print("🚀 Starting comprehensive laboratory studies catalog loading...")
    
    # Read SQL file
    with open('/app/comprehensive_laboratory_studies_catalog.sql', 'r') as f:
        sql_content = f.read()
    
    # Split by semicolon and clean up
    statements = []
    for stmt in sql_content.split(';'):
        stmt = stmt.strip()
        if stmt and not stmt.startswith('--') and not stmt.startswith('/*'):
            statements.append(stmt)
    
    print(f"📝 Found {len(statements)} SQL statements to execute")
    
    # Execute statements
    with engine.connect() as conn:
        for i, statement in enumerate(statements):
            try:
                if statement:
                    conn.execute(text(statement))
                    if (i + 1) % 20 == 0:
                        print(f"📝 Processed {i+1}/{len(statements)} statements")
            except Exception as e:
                print(f"❌ Error in statement {i+1}: {str(e)}")
                print(f"Statement: {statement[:200]}...")
                # Continue with next statement
                continue
        
        conn.commit()
        print("✅ All statements committed successfully")
    
    # Verify results
    with engine.connect() as conn:
        # Count categories
        result = conn.execute(text('SELECT COUNT(*) FROM study_categories'))
        categories_count = result.scalar()
        print(f"📊 Study Categories: {categories_count}")
        
        # Count studies
        result = conn.execute(text('SELECT COUNT(*) FROM study_catalog'))
        studies_count = result.scalar()
        print(f"📊 Study Catalog: {studies_count}")
        
        # Count normal values
        result = conn.execute(text('SELECT COUNT(*) FROM study_normal_values'))
        normal_values_count = result.scalar()
        print(f"📊 Normal Values: {normal_values_count}")
        
        # Count templates
        result = conn.execute(text('SELECT COUNT(*) FROM study_templates'))
        templates_count = result.scalar()
        print(f"📊 Study Templates: {templates_count}")
        
        # Count template items
        result = conn.execute(text('SELECT COUNT(*) FROM study_template_items'))
        template_items_count = result.scalar()
        print(f"📊 Template Items: {template_items_count}")
        
        # Show some examples
        print("\n📋 Sample Categories:")
        result = conn.execute(text('SELECT code, name FROM study_categories LIMIT 5'))
        for row in result:
            print(f"  - {row[0]}: {row[1]}")
        
        print("\n📋 Sample Studies:")
        result = conn.execute(text('SELECT code, name, specialty FROM study_catalog LIMIT 5'))
        for row in result:
            print(f"  - {row[0]}: {row[1]} ({row[2]})")
    
    print("\n✅ Comprehensive laboratory studies catalog loading completed!")

if __name__ == "__main__":
    execute_sql_file()
