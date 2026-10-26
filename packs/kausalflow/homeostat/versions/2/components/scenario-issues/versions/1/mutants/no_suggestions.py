"""Misspelt names get no 'Did you mean' hint."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original


def run(input):
    out = original(input)
    for error in out["errors"]:
        error["suggestion"] = None
    return out
