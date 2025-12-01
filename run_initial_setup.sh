#!/bin/bash
# Run initial database setup on production

echo "🚀 Running initial database setup..."

# Copy the SQL file to the server
scp backend/migration_initial_data.sql root@134.199.196.165:~/app/

# SSH and run the migration
ssh root@134.199.196.165 << 'ENDSSH'
cd ~/app
echo "📊 Executing migration_initial_data.sql..."
docker exec -i app-postgres-db-1 psql -U historias_user -d historias_clinicas < migration_initial_data.sql
echo "✅ Initial setup complete!"
ENDSSH

echo "✅ Done!"
