#!/bin/bash
# Script to migrate localhost database from PostgreSQL 15 to 16
# Usage: ./scripts/migrate-localhost-to-pg16.sh

set -e  # Exit on error

echo "🔄 Starting localhost database migration to PostgreSQL 16..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Backup directory
BACKUP_DIR="$HOME/db_backups"
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}Step 1: Creating backup of current database...${NC}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/localhost_backup_$TIMESTAMP.sql"

# Check if database is running
if ! docker compose ps postgres-db | grep -q "Up"; then
    echo -e "${YELLOW}Database not running. Starting it...${NC}"
    docker compose up -d postgres-db
    echo "Waiting for database to be ready..."
    sleep 10
fi

# Export default values for environment variables if not set
export POSTGRES_USER="${POSTGRES_USER:-historias_user}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-historias_pass}"
export POSTGRES_DB="${POSTGRES_DB:-historias_clinicas}"

# Create backup
echo "Creating backup: $BACKUP_FILE"
docker compose exec -T postgres-db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$BACKUP_FILE"

if [ ! -f "$BACKUP_FILE" ] || [ ! -s "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Backup failed! File is empty or doesn't exist.${NC}"
    exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo -e "${GREEN}✅ Backup created successfully: $BACKUP_FILE (Size: $BACKUP_SIZE)${NC}"
echo ""

echo -e "${YELLOW}Step 2: Stopping current database...${NC}"
docker compose down postgres-db
echo -e "${GREEN}✅ Database stopped${NC}"
echo ""

echo -e "${YELLOW}Step 3: Removing old PostgreSQL 15 volume...${NC}"
echo "⚠️  WARNING: This will delete the old database volume."
echo "   Your backup is safe at: $BACKUP_FILE"
read -p "Continue? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 1
fi

# Find and remove the volume
VOLUME_NAME=$(docker volume ls | grep postgres_data | awk '{print $2}' | head -1)
if [ ! -z "$VOLUME_NAME" ]; then
    docker volume rm "$VOLUME_NAME" 2>/dev/null || echo "Volume already removed or doesn't exist"
fi
echo -e "${GREEN}✅ Old volume removed${NC}"
echo ""

echo -e "${YELLOW}Step 4: Starting PostgreSQL 16...${NC}"
docker compose up -d postgres-db
echo "Waiting for database to be ready..."
sleep 15

# Wait for database to be ready
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker compose exec -T postgres-db pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" > /dev/null 2>&1; then
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Waiting for database... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ Database failed to start!${NC}"
    echo "Checking logs..."
    docker compose logs postgres-db | tail -20
    exit 1
fi

# Verify PostgreSQL version
VERSION=$(docker compose exec -T postgres-db postgres --version | grep -oP '\d+\.\d+' | head -1)
echo -e "${GREEN}✅ PostgreSQL $VERSION is running${NC}"
echo ""

echo -e "${YELLOW}Step 5: Restoring database from backup...${NC}"
docker compose exec -T postgres-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database restored successfully${NC}"
else
    echo -e "${RED}❌ Database restore failed!${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}Step 6: Verifying migration...${NC}"
# Check version
DB_VERSION=$(docker compose exec -T postgres-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT version();" | head -1)
echo "Database version: $DB_VERSION"

# Check some tables exist
TABLE_COUNT=$(docker compose exec -T postgres-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
echo "Tables found: $TABLE_COUNT"

if [ "$TABLE_COUNT" -gt "0" ]; then
    echo -e "${GREEN}✅ Migration completed successfully!${NC}"
    echo ""
    echo "Summary:"
    echo "  - Backup saved: $BACKUP_FILE"
    echo "  - PostgreSQL version: $VERSION"
    echo "  - Tables: $TABLE_COUNT"
    echo ""
    echo "You can now start your application with: docker compose up -d"
else
    echo -e "${RED}❌ Migration verification failed! No tables found.${NC}"
    exit 1
fi

