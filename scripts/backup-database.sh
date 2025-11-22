#!/bin/bash
# Database Backup Script for Production

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/lms_backup_$DATE.sql"
MAX_BACKUPS=30  # Keep last 30 backups

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== LMS Platform Database Backup ===${NC}"
echo "Timestamp: $(date)"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL environment variable is not set${NC}"
    exit 1
fi

# Extract database connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_URL=$DATABASE_URL

echo -e "${YELLOW}Starting backup...${NC}"

# Perform backup using pg_dump
if command -v pg_dump &> /dev/null; then
    pg_dump "$DB_URL" > "$BACKUP_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
        # Compress the backup
        gzip "$BACKUP_FILE"
        BACKUP_FILE="${BACKUP_FILE}.gz"
        
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo -e "${GREEN}✓ Backup completed successfully${NC}"
        echo "File: $BACKUP_FILE"
        echo "Size: $BACKUP_SIZE"
        
        # Clean up old backups
        echo -e "${YELLOW}Cleaning up old backups (keeping last $MAX_BACKUPS)...${NC}"
        cd "$BACKUP_DIR"
        ls -t lms_backup_*.sql.gz 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm
        
        REMAINING=$(ls -1 lms_backup_*.sql.gz 2>/dev/null | wc -l)
        echo -e "${GREEN}✓ Cleanup complete. $REMAINING backups retained.${NC}"
        
        exit 0
    else
        echo -e "${RED}✗ Backup failed${NC}"
        cat "$BACKUP_FILE"
        exit 1
    fi
else
    echo -e "${RED}Error: pg_dump not found. Please install PostgreSQL client tools.${NC}"
    exit 1
fi
