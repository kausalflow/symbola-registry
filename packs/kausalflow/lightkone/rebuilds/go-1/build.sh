#!/bin/sh
# Builds every component as a static linux/amd64 binary at <component>/impl.
set -e
cd "$(dirname "$0")"
rm -f */impl.py
export PATH="$PATH:/usr/local/go/bin"
for c in search-query bibtex-import bibtex-export citation-key pdf-filing library-merge tidy library-file; do
  [ -d "src/$c" ] || continue
  mkdir -p "$c"
  CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -buildvcs=false -ldflags="-s -w" -o "$c/impl" "./src/$c"
done
