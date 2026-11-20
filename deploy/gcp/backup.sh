#!/bin/sh
# Cópia consistente do banco SQLite (rodar na VM via cron). Opcional: enviar ao Cloud Storage.
set -e
DIR=/srv/festdecor
STAMP=$(date +%Y%m%d-%H%M)
mkdir -p "$DIR/backups"
docker run --rm -v "$DIR/data:/data" -v "$DIR/backups:/backups" keinos/sqlite3 \
  sqlite3 /data/festdecor.sqlite ".backup '/backups/festdecor-$STAMP.sqlite'"
tar -czf "$DIR/backups/assets-$STAMP.tgz" -C "$DIR/data" assets
find "$DIR/backups" -type f -mtime +14 -delete
# gsutil cp "$DIR/backups/festdecor-$STAMP.sqlite" "gs://SEU_BUCKET/" (se configurar um bucket)
