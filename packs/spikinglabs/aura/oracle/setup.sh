#!/bin/sh
# Usage: sh oracle/setup.sh <component>   (from the pack root) - regenerates schema, pins the oracle to the contract, records examples.
set -e
n=$1
c=versions/1/components/$n/versions/1
symbola schema $c >/dev/null
rm -f oracle/$n/symbolon-impl.toml
symbola impl-init oracle/$n --contract $c --author spikinglabs/aura >/dev/null
python3 - "$n" <<'PY'
import re, sys
p = f"oracle/{sys.argv[1]}/symbolon-impl.toml"
s = open(p).read()
s = re.sub(r'language = ".*"', 'language = "command"', s)
s = re.sub(r'(?m)^(entrypoint|command) = .*\n', '', s)
s = s.replace('language = "command"', 'language = "command"\ncommand = ["node", "adapter.mjs"]')
open(p, "w").write(s)
PY
rm -f oracle/$n/impl.py
/root/.local/share/uv/tools/symbola/bin/python oracle/record.py $n
