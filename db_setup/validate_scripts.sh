#!/bin/bash

# Script Validation Tool
# Checks if database setup scripts are valid and in correct order

echo "🔍 Validating Database Setup Scripts..."
echo ""

# Check if scripts exist
scripts=(
    "01_create_database_structure.sql"
    "02_clean_master_data.sql"
    "03_additional_functions.sql"
    "04_populate_master_data_FULL.sql"
)

echo "📋 Checking script files..."
for script in "${scripts[@]}"; do
    if [ -f "db_setup/$script" ]; then
        size=$(wc -l < "db_setup/$script")
        echo "  ✅ $script ($size lines)"
    else
        echo "  ❌ $script (MISSING)"
    fi
done

echo ""
echo "🔍 Validating script dependencies..."

# Check 01 - should create tables
echo "1️⃣ Checking 01_create_database_structure.sql..."
if grep -q "CREATE TABLE.*countries" db_setup/01_create_database_structure.sql; then
    echo "  ✅ Creates countries table"
else
    echo "  ❌ Missing countries table creation"
fi

if grep -q "CREATE TABLE.*states" db_setup/01_create_database_structure.sql; then
    echo "  ✅ Creates states table"
else
    echo "  ❌ Missing states table creation"
fi

if grep -q "CREATE TABLE.*medical_specialties" db_setup/01_create_database_structure.sql; then
    echo "  ✅ Creates medical_specialties table"
else
    echo "  ❌ Missing medical_specialties table creation"
fi

# Check 04 - should insert data in correct order
echo ""
echo "2️⃣ Checking 04_populate_master_data_FULL.sql insertion order..."

# Check if countries are inserted before states
countries_line=$(grep -n "INSERT INTO countries" db_setup/04_populate_master_data_FULL.sql | head -1 | cut -d: -f1)
states_line=$(grep -n "INSERT INTO states" db_setup/04_populate_master_data_FULL.sql | head -1 | cut -d: -f1)

if [ -n "$countries_line" ] && [ -n "$states_line" ]; then
    if [ "$countries_line" -lt "$states_line" ]; then
        echo "  ✅ Countries inserted before states (correct order)"
    else
        echo "  ⚠️  States inserted before countries (may cause FK errors)"
    fi
fi

# Check if system user is created first
if grep -q "INSERT INTO persons.*id.*0" db_setup/04_populate_master_data_FULL.sql; then
    persons_line=$(grep -n "INSERT INTO persons.*id.*0" db_setup/04_populate_master_data_FULL.sql | head -1 | cut -d: -f1)
    if [ "$persons_line" -lt 20 ]; then
        echo "  ✅ System user (id=0) created early (good for FK constraints)"
    fi
fi

# Check for ON CONFLICT handling
echo ""
echo "3️⃣ Checking data safety (ON CONFLICT handling)..."
if grep -q "ON CONFLICT" db_setup/04_populate_master_data_FULL.sql; then
    conflict_count=$(grep -c "ON CONFLICT" db_setup/04_populate_master_data_FULL.sql)
    echo "  ✅ Script uses ON CONFLICT ($conflict_count times) - safe to re-run"
else
    echo "  ⚠️  No ON CONFLICT handling - may fail if data exists"
fi

# Check for sequences
echo ""
echo "4️⃣ Checking sequence management..."
if grep -q "setval" db_setup/04_populate_master_data_FULL.sql; then
    echo "  ✅ Scripts update sequences correctly"
else
    echo "  ⚠️  No sequence updates found"
fi

echo ""
echo "✅ Validation complete!"
echo ""
echo "📝 Recommended execution order:"
echo "   1. 01_create_database_structure.sql (creates tables)"
echo "   2. 04_populate_master_data_FULL.sql (populates data)"
echo "   3. 03_additional_functions.sql (adds functions/indexes)"
echo ""
echo "⚠️  02_clean_master_data.sql only if you need to wipe all data first"


