#!/bin/bash
# Script to set up new PostgreSQL 16 database host for production
# Usage: ./scripts/setup-new-production-db.sh [NEW_HOST] [BACKUP_FILE]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

NEW_HOST="${1:-root@new-db-host-ip}"
BACKUP_FILE="${2:-$HOME/db_backups/do_backup_*.sql}"

# Database credentials (update if different)
DB_USER="cortex_admin"
DB_PASSWORD="Cortex#2025!Secure"
DB_NAME="cortex_clinic_db"

echo -e "${YELLOW}🚀 Setting up new PostgreSQL 16 database host...${NC}"
echo "Host: $NEW_HOST"
echo ""

# Step 1: Install Docker if needed
echo -e "${YELLOW}Step 1: Checking Docker installation...${NC}"
ssh "$NEW_HOST" "command -v docker >/dev/null 2>&1 || { curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh; }"
echo -e "${GREEN}✅ Docker ready${NC}"
echo ""

# Step 2: Create docker-compose file
echo -e "${YELLOW}Step 2: Creating PostgreSQL 16 configuration...${NC}"
ssh "$NEW_HOST" "mkdir -p /opt/postgres-data && cd /opt && cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  postgres-db:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: $DB_USER
      POSTGRES_PASSWORD: $DB_PASSWORD
      POSTGRES_DB: $DB_NAME
    ports:
      - \"5432:5432\"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: [\"CMD-SHELL\", \"pg_isready -U $DB_USER -d $DB_NAME\"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
EOF
"

echo -e "${GREEN}✅ Configuration created${NC}"
echo ""

# Step 3: Start PostgreSQL 16
echo -e "${YELLOW}Step 3: Starting PostgreSQL 16...${NC}"
ssh "$NEW_HOST" "cd /opt && docker compose up -d postgres-db"
echo "Waiting for database to be ready..."
sleep 15

# Wait for database
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if ssh "$NEW_HOST" "docker exec \$(docker ps -q -f name=postgres-db) pg_isready -U $DB_USER -d $DB_NAME" > /dev/null 2>&1; then
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Waiting for database... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ Database failed to start!${NC}"
    exit 1
fi

# Verify version
VERSION=$(ssh "$NEW_HOST" "docker exec \$(docker ps -q -f name=postgres-db) postgres --version | grep -oP '\d+\.\d+' | head -1")
echo -e "${GREEN}✅ PostgreSQL $VERSION is running${NC}"
echo ""

# Step 4: Restore backup if provided
if [ -f "$BACKUP_FILE" ] || [ -n "$BACKUP_FILE" ]; then
    echo -e "${YELLOW}Step 4: Restoring database from backup...${NC}"
    
    # Find the actual backup file if wildcard was used
    if [[ "$BACKUP_FILE" == *"*"* ]]; then
        BACKUP_FILE=$(ls -t $BACKUP_FILE 2>/dev/null | head -1)
    fi
    
    if [ ! -f "$BACKUP_FILE" ]; then
        echo -e "${RED}❌ Backup file not found: $BACKUP_FILE${NC}"
        exit 1
    fi
    
    echo "Uploading backup to server..."
    scp "$BACKUP_FILE" "$NEW_HOST:/tmp/restore_backup.sql"
    
    echo "Restoring database..."
    ssh "$NEW_HOST" "docker exec -i \$(docker ps -q -f name=postgres-db) psql -U $DB_USER -d $DB_NAME < /tmp/restore_backup.sql"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database restored successfully${NC}"
        
        # Verify
        TABLE_COUNT=$(ssh "$NEW_HOST" "docker exec \$(docker ps -q -f name=postgres-db) psql -U $DB_USER -d $DB_NAME -t -c \"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';\" | tr -d ' '")
        echo "Tables found: $TABLE_COUNT"
    else
        echo -e "${RED}❌ Database restore failed!${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}Step 4: Skipping restore (no backup file provided)${NC}"
fi

echo ""
echo -e "${GREEN}✅ New production database is ready!${NC}"
echo ""
echo "Next steps:"
echo "1. Update DATABASE_URL in Coolify to:"
echo "   postgresql://$DB_USER:$DB_PASSWORD@$(echo $NEW_HOST | cut -d'@' -f2):5432/$DB_NAME"
echo "2. Restart your application in Coolify"
echo "3. Verify the application is working"



