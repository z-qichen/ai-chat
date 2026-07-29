#!/bin/sh
# backup-db.sh — SQLite 数据库自动备份
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
DB_PATH="$PROJECT_DIR/data/ai-chat.db"
FILES_DIR="$PROJECT_DIR/data/files"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

mkdir -p "$BACKUP_DIR"

if [ -f "$DB_PATH" ]; then
    sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/db_${TIMESTAMP}.sqlite'"
    echo "数据库备份完成: db_${TIMESTAMP}.sqlite"
else
    echo "数据库文件不存在: $DB_PATH"
fi

if [ -d "$FILES_DIR" ] && [ "$(ls -A "$FILES_DIR" 2>/dev/null)" ]; then
    tar -czf "$BACKUP_DIR/files_${TIMESTAMP}.tar.gz" -C "$PROJECT_DIR/data" files/
    echo "文件备份完成: files_${TIMESTAMP}.tar.gz"
fi

find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete
echo "已清理 ${RETENTION_DAYS} 天前的旧备份"
