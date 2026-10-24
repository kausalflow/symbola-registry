#!/usr/bin/env bash
# Build the pack registry site into OUT, served from ORIGIN + BASE.
#   registry-site/build.sh site/registry https://kausalflow.github.io /symbolon/registry
set -euo pipefail
out=$(realpath -m "$1"); origin=$2; base=${3%/}
cd "$(dirname "$0")"
npm ci --no-audit --no-fund
# Priced packs need the store (store/README.md): their tarballs go to private/ for R2.
symbolon site build ../packs --out public --base-url "$origin$base" \
  ${STORE_URL:+--store-url "$STORE_URL" --private-out private}
SITE_ORIGIN=$origin SITE_BASE=$base npx astro build
npx pagefind --site dist
rm -rf "$out" && mkdir -p "$(dirname "$out")" && cp -r dist "$out"
