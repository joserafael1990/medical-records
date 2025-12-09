#!/bin/bash
# Script to populate database and immediately verify data persists

CONNECTION_STRING="postgresql://cortex_admin:!E!yDTrN2l6ym4@cortexdb.postgres.database.azure.com:5432/cortex_clinic_db?sslmode=require"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔍 Step 1: Checking current database connection..."
psql "$CONNECTION_STRING" -c "SELECT current_database() as db, current_user as user, version();"

echo ""
echo "📊 Step 2: Checking current data (before populate)..."
psql "$CONNECTION_STRING" -f "$SCRIPT_DIR/verify_data.sql"

echo ""
echo "🚀 Step 3: Running populate script..."
psql "$CONNECTION_STRING" -f "$SCRIPT_DIR/04_populate_master_data_FULL.sql" -v ON_ERROR_STOP=1

if [ $? -ne 0 ]; then
    echo "❌ ERROR: Populate script failed!"
    exit 1
fi

echo ""
echo "✅ Step 4: Verifying data immediately after insert..."
psql "$CONNECTION_STRING" -f "$SCRIPT_DIR/verify_data.sql"

echo ""
echo "⏳ Step 5: Waiting 5 seconds..."
sleep 5

echo ""
echo "🔍 Step 6: Verifying data in a fresh connection (simulating reconnect)..."
psql "$CONNECTION_STRING" -f "$SCRIPT_DIR/verify_data.sql"

echo ""
echo "✅ Done! If data appears in Step 6, it's persisted correctly."
echo "❌ If data is missing in Step 6, there's a persistence issue."

