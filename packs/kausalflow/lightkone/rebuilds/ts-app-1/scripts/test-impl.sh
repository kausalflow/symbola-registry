#!/usr/bin/env bash
# Runs every component's contract checks against its build.
set -euo pipefail
cd "$(dirname "$0")/.."
status=0
for dir in impl/*/; do
  name=$(basename "$dir")
  [[ $name == _* ]] && continue
  symbola test "spec/components/$name/versions/1" "impl/$name" || status=1
done
exit $status
