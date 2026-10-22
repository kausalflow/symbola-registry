#!/usr/bin/env bash
# Bundle each adapter with lightkone's own source into a self-contained
# implementation directory, so the original product can be attested against
# its contracts like any other implementation.
#
#   LIGHTKONE=/path/to/lightkone ./build.sh
#
# Uses the rolldown bundler from lightkone's node_modules (run `npm ci` there first).
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
: "${LIGHTKONE:?set LIGHTKONE to a lightkone checkout}"
lk=$(cd "$LIGHTKONE" && pwd)
commit=$(git -C "$lk" rev-parse HEAD)
contracts="$here/../1/components"

for adapter in "$here"/adapters/*.ts; do
  name=$(basename "$adapter" .ts)
  [ "$name" = serve ] && continue
  [ -d "$contracts/$name/1" ] || { echo "skip $name: no contract yet"; continue; }
  out="$here/$name"
  mkdir -p "$out"
  cat > "$here/.rolldown.config.mjs" <<CFG
export default {
  input: "$adapter",
  platform: "node",
  resolve: { alias: { lightkone: "$lk" } },
  output: { file: "$out/impl.mjs", format: "esm", minify: false },
};
CFG
  (cd "$lk" && npx --no-install rolldown -c "$here/.rolldown.config.mjs" > /dev/null)
  rm "$here/.rolldown.config.mjs"
  digest=$(symbolon digest "$contracts/$name/1")
  cat > "$out/symbolon-impl.toml" <<TOML
# Lightkone's own code, bundled from kausalflow/lightkone@$commit by oracle/build.sh.
[implementation]
contract = "$digest"
language = "command"
command = ["node", "impl.mjs"]
license = "Proprietary (kausalflow)"
authors = ["kausalflow/lightkone"]
TOML
  echo "built $name from lightkone@${commit:0:7}"
done
