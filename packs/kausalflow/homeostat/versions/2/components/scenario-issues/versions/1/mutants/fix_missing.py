"""Errors other than schema errors carry no fix."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original


def run(input):
    out = original(input)
    for error in out["errors"]:
        if error["code"] == "E_SCHEMA":
            continue
        error["has_fix"] = False
    return out
