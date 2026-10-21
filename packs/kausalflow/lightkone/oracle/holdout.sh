#!/usr/bin/env bash
# Check an implementation against the publisher's holdout for one component:
# the published spec with a different property seed and five times the
# generated cases, plus golden examples the builder never saw.
#
#   ./holdout.sh search-query path/to/impl
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
name=$1 impl=$(cd "$2" && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cp -r "$here/../1/components/$name/1" "$work/contract"
cat "$here/holdout/$name.jsonl" >> "$work/contract/examples.jsonl"
python3 - "$work/contract/symbolon.toml" <<'PY'
import re, sys
p = sys.argv[1]
s = open(p).read()
s = re.sub(r"^seed = \d+$", "seed = 20261021", s, flags=re.M)
s = re.sub(r"^max_examples = (\d+)$", lambda m: f"max_examples = {int(m.group(1)) * 5}", s, flags=re.M)
open(p, "w").write(s)
PY
symbolon test "$work/contract" "$impl"
