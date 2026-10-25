#!/usr/bin/env bash
cd /root/rebuild/lightkone-rebuild
CHROMIUM=/tmp/chromium timeout 400 node --experimental-transform-types --no-warnings tests/e2e.ts > .dev/e2e.log 2>&1
echo "exit $?" >> .dev/e2e.log
grep -E "^•" .dev/e2e.log | tail -2
grep -v "^•" .dev/e2e.log | head -${1:-25}
