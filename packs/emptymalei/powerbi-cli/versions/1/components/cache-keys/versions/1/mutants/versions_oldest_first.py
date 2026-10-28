"""Versions are listed oldest first, so the latest read picks the oldest."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    out = original(input)
    if input["op"] == "index":
        out["versions"] = {k: list(reversed(v)) for k, v in out["versions"].items()}
        out["latest"] = {k: (v[0] if v else None) for k, v in out["versions"].items()}
    return out
