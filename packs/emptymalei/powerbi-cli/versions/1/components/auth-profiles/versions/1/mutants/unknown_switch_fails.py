"""Switching to an unknown profile exits 1 instead of reporting it with exit 0."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    out = original(input)
    if input["argv"][:2] == ["profile", "switch"] and "not found" in out["stdout"]:
        out["exit_code"] = 1
    return out
