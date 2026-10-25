#!/usr/bin/env bash
# Runs `symbola site check` on some packs instead of the whole registry.
#
#   check-packs.sh --all            every pack
#   check-packs.sh --since REV      the packs that changed since REV, or every pack when something
#                                   that affects all of them changed (the CLI pin, CI, this script)
#   check-packs.sh OWNER/NAME...    these packs
#
# Each pack's check stands alone (its latest version validates, its released versions are
# unchanged), so checking only what a pull request touches gives the same answer as checking
# everything, at a cost that does not grow with the registry.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

all=false
packs=()
case "${1:-}" in
  --all) all=true ;;
  --since)
    changed=$(git diff --name-only "$2" HEAD)
    if grep -qE '^(\.symbolon-version|\.github/)' <<<"$changed"; then all=true; fi
    mapfile -t packs < <(sed -nE 's#^packs/([^/]+/[^/]+)/.*#\1#p' <<<"$changed" | sort -u)
    ;;
  "") echo "usage: check-packs.sh --all | --since REV | OWNER/NAME..." >&2; exit 2 ;;
  *) packs=("$@") ;;
esac

if $all; then
  echo "Checking every pack."
  exec symbola site check packs
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
n=0
for p in "${packs[@]}"; do
  [ -d "packs/$p/versions" ] || { echo "$p: removed"; continue; }
  mkdir -p "$tmp/$(dirname "$p")"
  cp -r "packs/$p" "$tmp/$p"
  n=$((n + 1))
done
if [ "$n" = 0 ]; then echo "No packs changed."; exit 0; fi
echo "Checking $n pack(s): ${packs[*]}"
symbola site check "$tmp"
