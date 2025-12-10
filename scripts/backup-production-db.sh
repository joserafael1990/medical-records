#!/bin/bash
# Script to backup production database from DigitalOcean
# Usage: ./scripts/backup-production-db.sh [DO_HOST] [CONTAINER_NAME]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Default values (update these with your actual values)
DO_HOST="${1:-root@your-do-ip}"
CONTAINER_NAME="${2:-postgres-db-ewkwg8o00c0c0kwg0kosoo8o-194908167783}"
DB_USER="${3:-cortex_admin}"
DB_NAME="${4:-cortex_clinic_db}"

BACKUP_DIR="$HOME/db_backups"
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}📦 Backing up production database...${NC}"
echo "Host: $DO_HOST"
echo "Container: $CONTAINER_NAME"
echo "Database: $DB_NAME"
echo ""

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/do_backup_$TIMESTAMP.sql"

# Create backup on remote server
echo "Creating backup on remote server..."
ssh "$DO_HOST" "mkdir -p ~/db_backups && docker exec $CONTAINER_NAME pg_dump -U $DB_USER -d $DB_NAME > ~/db_backups/do_backup_$TIMESTAMP.sql"

# Download backup to local machine
echo "Downloading backup to local machine..."
scp "$DO_HOST:~/db_backups/do_backup_$TIMESTAMP.sql" "$BACKUP_FILE"

if [ ! -f "$BACKUP_FILE" ] || [ ! -s "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Backup failed!${NC}"
    exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo -e "${GREEN}✅ Backup completed successfully!${NC}"
echo "Backup location: $BACKUP_FILE"
echo "Backup size: $BACKUP_SIZE"





