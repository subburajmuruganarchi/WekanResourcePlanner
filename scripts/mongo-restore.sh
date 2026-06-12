#!/usr/bin/env bash
# R360 MongoDB restore — manual ops only. DESTRUCTIVE to target database.
# Requires: mongorestore in PATH
#
# Example:
#   export MONGO_URI="mongodb://localhost:27017/r360"
#   ./scripts/mongo-restore.sh ./backups/r360-20260101-120000
#
# Pass --drop only when you intend to replace existing collections.

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup-directory> [--drop]"
  exit 1
fi

BACKUP_DIR="$1"
DROP_FLAG="${2:-}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "ERROR: Backup directory not found: $BACKUP_DIR"
  exit 1
fi

if [ -z "${MONGO_URI:-}" ] && [ -f "$ROOT_DIR/backend/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/backend/.env"
  set +a
  MONGO_URI="${MONGO_URI:-${DATABASE_URL:-}}"
fi

if [ -z "${MONGO_URI:-}" ]; then
  echo "ERROR: Set MONGO_URI or DATABASE_URL before running this script."
  exit 1
fi

echo "WARNING: This will restore into the database defined by MONGO_URI."
echo "URI: ${MONGO_URI%%@*}@***"
read -r -p "Type RESTORE to continue: " CONFIRM
if [ "$CONFIRM" != "RESTORE" ]; then
  echo "Aborted."
  exit 1
fi

echo "Restoring from $BACKUP_DIR ..."
mongorestore --uri="$MONGO_URI" --dir="$BACKUP_DIR" $DROP_FLAG

echo "Restore complete."
