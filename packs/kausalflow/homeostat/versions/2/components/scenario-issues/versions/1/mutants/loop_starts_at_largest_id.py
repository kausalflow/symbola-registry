"""An algebraic loop is reported starting at the largest id instead of the smallest."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original


def run(input):
    out = original(input)
    for error in out["errors"]:
        if error["code"] == "E_ALGEBRAIC_LOOP":
            ring = error["location"].split(" -> ")[:-1]
            start = ring.index(max(ring))
            ring = ring[start:] + ring[:start]
            error["location"] = " -> ".join([*ring, ring[0]])
    return out
