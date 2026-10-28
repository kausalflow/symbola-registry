"""The slug joins words with underscores instead of dashes."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    out = original(input)
    for entry in out["entries"]:
        if entry["name"] and entry["file_stem"] != entry["id"]:
            slug = entry["file_stem"][: -len(entry["id"]) - 1]
            entry["file_stem"] = slug.replace("-", "_") + "-" + entry["id"]
    return out
