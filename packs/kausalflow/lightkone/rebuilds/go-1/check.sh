#!/bin/sh
# Rebuilds the binaries and checks each one against the implementation digest its
# attestation signed, so the evidence holds without the binaries in git.
set -e
here="$(cd "$(dirname "$0")" && pwd)"
att="$here/../../attestations"
sh "$here/build.sh"
for toml in "$here"/*/symbolon-impl.toml; do
  dir="$(dirname "$toml")"; c="$(basename "$dir")"
  printf '%s: ' "$c"
  symbolon verify "$att/$c.go-1.json" --impl "$dir" > "$here/.verify.log" || { cat "$here/.verify.log"; exit 1; }
  grep -q "digests match local copies" "$here/.verify.log" && echo "implementation digest matches"
done
rm -f "$here/.verify.log"
