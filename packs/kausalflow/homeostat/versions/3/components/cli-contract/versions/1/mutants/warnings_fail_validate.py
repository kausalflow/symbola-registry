"""A scenario with warnings exits 1."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original


def run(input):
    out = original(input)
    if input["argv"][:1] == ["validate"] and out["exit_code"] == 0 and any(code.startswith("W_") for code in out["codes"]):
        out["exit_code"] = 1
    return out
