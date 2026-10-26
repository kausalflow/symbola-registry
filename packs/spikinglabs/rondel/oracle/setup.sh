#!/bin/sh
# Pin an oracle adapter to its component's current contract: oracle/setup.sh <name> [adapter file]
# The adapter runs Rondel's own TypeScript from the checkout in RONDEL_SRC (default /root/w/rondel).
set -e
here=$(cd "$(dirname "$0")" && pwd)
name=$1
adapter=${2:-adapter.mts}
contract="$here/../versions/1/components/$name/versions/1"
symbola schema "$contract" >/dev/null
rm -f "$here/$name/symbolon-impl.toml"
symbola impl-init "$here/$name" --contract "$contract" --author spikinglabs/rondel >/dev/null
python3 - "$here/$name/symbolon-impl.toml" "$adapter" <<'PY'
import re, sys
p, adapter = sys.argv[1:]
s = open(p).read()
s = s.replace('language = "python"', 'language = "command"')
s = re.sub(r'entrypoint = ".*"\n', '', s)
cmd = 'command = ["sh", "-c", "cd \\"${RONDEL_SRC:-/root/w/rondel}\\" && exec node --import tsx \\"$OLDPWD/%s\\""]\n' % adapter
s = s.replace('language = "command"\n', 'language = "command"\n' + cmd)
open(p, 'w').write(s)
PY
cat "$here/$name/symbolon-impl.toml"
