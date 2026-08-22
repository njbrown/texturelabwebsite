#!/bin/sh
# Bring the database up to date and make sure the /ops admin exists before the
# server accepts traffic. Both steps are idempotent, so this is safe to run on
# every boot and on every replica. Any failure aborts the boot (set -e).
set -e

echo "==> Running migrations"
node ace migration:run --force

echo "==> Seeding /ops admin"
node ace db:seed --files "./database/seeders/admin_seeder.js"

exec "$@"
