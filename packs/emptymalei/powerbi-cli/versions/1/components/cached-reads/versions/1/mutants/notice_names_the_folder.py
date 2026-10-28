"""The notice quotes the version folder's name instead of the version stored in the file."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

import json


def run(input):
    out = original(input)
    files = input.get("files") or {}
    if out["lines"] and out["lines"][0].startswith("Using cached data"):
        stored = [json.loads(t)["version"] for p, t in files.items() if p.startswith("cache/") and t.startswith("{\"cache_key")]
        for path in files:
            if path.startswith("cache/") and any(f"(version: {v})" in out["lines"][0] for v in stored):
                folder = sorted(p.split("/")[2] for p in files if p.startswith("cache/") and p.count("/") == 3)[-1]
                out["lines"][0] = out["lines"][0].rsplit("(version: ", 1)[0] + f"(version: {folder})"
                break
    return out
