#!/usr/bin/env bash
# Build the pack registry site into OUT, served from ORIGIN + BASE.
#   registry-site/build.sh site/registry https://kausalflow.github.io /symbolon/registry
set -euo pipefail
out=$(realpath -m "$1"); origin=$2; base=${3%/}
cd "$(dirname "$0")"
npm ci --no-audit --no-fund
symbolon site build ../packs --out public --base-url "$origin$base"
SITE_ORIGIN=$origin SITE_BASE=$base npx astro build
npx pagefind --site dist
rm -rf "$out" && mkdir -p "$(dirname "$out")" && cp -r dist "$out"
