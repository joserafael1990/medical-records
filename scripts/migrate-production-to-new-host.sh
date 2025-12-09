#!/bin/bash
# Complete script to migrate production database to new host with PostgreSQL 16
# Usage: ./scripts/migrate-production-to-new-host.sh [OLD_HOST] [NEW_HOST] [CONTAINER_NAME]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

OLD_HOST="${1:-root@your-do-ip}"
NEW_HOST="${2:-root@new-db-host-ip}"
CONTAINER_NAME="${3:-postgres-db-ewkwg8o00c0c0kwg0kosoo8o-194908167783}"
DB_USER="${4:-cortex_admin}"
DB_NAME="${5:-cortex_clinic_db}"

echo -e "${YELLOW}🔄 Starting production database migration to new host...${NC}"
echo "Old host: $OLD_HOST"
echo "New host: $NEW_HOST"
echo ""

# Step 1: Backup from old host
echo -e "${YELLOW}Step 1: Backing up from old host...${NC}"
./scripts/backup-production-db.sh "$OLD_HOST" "$CONTAINER_NAME" "$DB_USER" "$DB_NAME"

# Find the latest backup
BACKUP_FILE=$(ls -t ~/db_backups/do_backup_*.sql | head -1)
echo "Using backup: $BACKUP_FILE"
echo ""

# Step 2: Set up new host
echo -e "${YELLOW}Step 2: Setting up new database host...${NC}"
./scripts/setup-new-production-db.sh "$NEW_HOST" "$BACKUP_FILE"

echo ""
echo -e "${GREEN}✅ Migration completed!${NC}"
echo ""
echo "Summary:"
echo "  - Backup created: $BACKUP_FILE"
echo "  - New database host: $NEW_HOST"
echo "  - PostgreSQL version: 16"
echo ""
echo "⚠️  IMPORTANT: Update DATABASE_URL in Coolify before restarting your application!"



