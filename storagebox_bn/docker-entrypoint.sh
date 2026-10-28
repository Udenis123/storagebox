#!/bin/sh
set -eu
# Apply pending Prisma migrations before the API accepts traffic.
npx prisma migrate deploy
exec "$@"
