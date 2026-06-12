#!/usr/bin/env bash
# R360 MongoDB backup — manual ops only (no scheduler).
# Requires: mongodump in PATH, MONGO_URI in environment or backend/.env
#
# Example:
#   export MONGO_URI="mongodb://localhost:27017/r360"
#   ./scripts/mongo-backup.sh
#
# Output: ./backups/r360-YYYYMMDD-HHMMSS/ (never overwrites prior backups)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-$ROOT_DIR/backups}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="$BACKUP_ROOT/r360-$TIMESTAMP"

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

mkdir -p "$OUT_DIR"

echo "Backing up to $OUT_DIR ..."
mongodump --uri="$MONGO_URI" --out="$OUT_DIR"

echo "Done. Archive path: $OUT_DIR"
echo "To restore: ./scripts/mongo-restore.sh $OUT_DIR"
