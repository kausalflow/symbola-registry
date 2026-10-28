"""The result file is named after the name's slug alone, so two workspaces can collide."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    out = original(input)
    for entry in out["entries"]:
        if entry["name"] and entry["file_stem"] != entry["id"]:
            entry["file_stem"] = entry["file_stem"][: -len(entry["id"]) - 1]
    return out
