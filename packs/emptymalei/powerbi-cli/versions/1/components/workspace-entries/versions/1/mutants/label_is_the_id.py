"""The label is always the id, even when the entry has a name."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    out = original(input)
    for entry in out["entries"]:
        entry["label"] = entry["id"]
    return out
