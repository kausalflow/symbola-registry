#!/bin/sh
# Builds every component as a static linux/amd64 binary at <component>/impl.
#
# The binaries are not kept in git. The build is byte-for-byte reproducible: Go 1.24.7
# (the go command fetches it if yours is older), with golang.org/x/text v0.21.0 vendored
# from the module proxy and checked against go.sum. check.sh confirms the result.
set -e
cd "$(dirname "$0")"
rm -f */impl.py
export PATH="$PATH:/usr/local/go/bin"
export GOTOOLCHAIN=go1.24.7
[ -f vendor/modules.txt ] || go mod vendor
for c in search-query bibtex-import bibtex-export citation-key pdf-filing library-merge tidy library-file; do
  [ -d "src/$c" ] || continue
  mkdir -p "$c"
  CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -mod=vendor -trimpath -buildvcs=false -ldflags="-s -w" -o "$c/impl" "./src/$c"
done
