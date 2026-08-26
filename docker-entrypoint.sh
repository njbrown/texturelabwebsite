#!/bin/sh
# Bring the database up to date and make sure the /ops admin exists before the
# server accepts traffic. Both steps are idempotent, so this is safe to run on
# every boot and on every replica. Any failure aborts the boot (set -e).
set -e

# This image is production-only: it ships a pre-built app and prunes dev
# dependencies. Booting it in any other mode starts the Vite dev server and
# looks for tooling that is not installed, and it would serve debug error pages
# over non-secure cookies. A NODE_ENV inherited from the host is therefore
# overridden rather than trusted.
if [ "${NODE_ENV}" != "production" ]; then
  echo "==> NODE_ENV was '${NODE_ENV:-unset}', forcing 'production'"
  export NODE_ENV=production
fi

echo "==> Running migrations"
node ace migration:run --force

echo "==> Seeding /ops admin"
node ace db:seed --files "./database/seeders/admin_seeder.js"

exec "$@"
