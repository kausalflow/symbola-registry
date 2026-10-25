"""A failed expectation exits 1 like an invalid scenario, not 3."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original


def run(input):
    out = original(input)
    if out["exit_code"] == 3:
        out["exit_code"] = 1
    return out
