"""A usage error exits 1."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original


def run(input):
    out = original(input)
    if out["exit_code"] == 2:
        out["exit_code"] = 1
    return out
