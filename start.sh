#!/bin/sh
set -e

# Restore database from replica if it exists and local DB is missing
if [ -n "$LITESTREAM_BUCKET" ]; then
  echo "Restoring database from Cloudflare R2 if backup exists..."
  litestream restore -if-db-not-exists -if-replica-exists /app/data/coda.db
fi

# Run Litestream replication in the background
if [ -n "$LITESTREAM_BUCKET" ]; then
  echo "Starting Litestream replication..."
  litestream replicate &
else
  echo "Litestream environment variables not configured. Skipping replication."
fi

# Start the Node.js server
exec node app.js
