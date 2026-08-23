#!/usr/bin/env bash
# ==============================================================================
# Database Backup Script — Aditya Air Compressors
# ==============================================================================

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PATH="${BACKUP_DIR}/aac_backup_${TIMESTAMP}"

mkdir -p "$BACKUP_DIR"

echo "💾 Starting database backup at $(date)..."

if [ -n "$MONGODB_URI" ]; then
    echo "Exporting MongoDB database..."
    mongodump --uri="$MONGODB_URI" --out="$BACKUP_PATH"
    tar -czf "${BACKUP_PATH}.tar.gz" -C "$BACKUP_DIR" "aac_backup_${TIMESTAMP}"
    rm -rf "$BACKUP_PATH"
    echo "✅ MongoDB backup saved to: ${BACKUP_PATH}.tar.gz"
else
    echo "Exporting local JSON stores..."
    tar -czf "${BACKUP_PATH}_json.tar.gz" backend/data/
    echo "✅ Local data backup saved to: ${BACKUP_PATH}_json.tar.gz"
fi

# Keep only last 14 days of backups
find "$BACKUP_DIR" -type f -name "*.tar.gz" -mtime +14 -exec rm {} \;
echo "🧹 Old backups pruned (retention: 14 days)."
