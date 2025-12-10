#!/bin/bash

# Production Database Setup Script for Azure
# This script populates the Azure database with all master/catalog data

DB_URL="postgresql://cortex_admin:!E!yDTrN2l6ym4@cortexdb.postgres.database.azure.com:5432/cortex_clinic_db?sslmode=require"

echo "🚀 Setting up Production Database (Azure)"
echo "=========================================="
echo ""

# Step 1: Populate master data
echo "1️⃣ Populating master data (countries, states, specialties, studies, medications, diagnoses)..."
psql "$DB_URL" -f db_setup/04_populate_master_data_FULL.sql

if [ $? -eq 0 ]; then
    echo "✅ Master data populated successfully!"
else
    echo "❌ Error populating master data"
    exit 1
fi

echo ""

# Step 2: Add functions and indexes (optional but recommended)
echo "2️⃣ Adding functions and indexes..."
psql "$DB_URL" -f db_setup/03_additional_functions.sql

if [ $? -eq 0 ]; then
    echo "✅ Functions and indexes added successfully!"
else
    echo "⚠️  Warning: Functions script had errors (may be non-critical)"
fi

echo ""
echo "📊 Verifying data..."
echo ""

# Verification queries
psql "$DB_URL" -c "
SELECT 
    'Countries' as table_name, 
    COUNT(*) as count 
FROM countries 
WHERE is_active = true
UNION ALL
SELECT 'States', COUNT(*) FROM states WHERE is_active = true
UNION ALL
SELECT 'Specialties', COUNT(*) FROM medical_specialties WHERE is_active = true
UNION ALL
SELECT 'Studies', COUNT(*) FROM study_catalog WHERE is_active = true
UNION ALL
SELECT 'Medications', COUNT(*) FROM medications WHERE is_active = true
UNION ALL
SELECT 'Diagnoses', COUNT(*) FROM diagnosis_catalog WHERE is_active = true
ORDER BY table_name;
"

echo ""
echo "✅ Production database setup complete!"
echo ""
echo "💡 Next steps:"
echo "   - Verify API endpoints return data"
echo "   - Test frontend to ensure catalog data displays"
echo "   - Check backend logs for any errors"


