"""The causal graph marks every edge as instantaneous."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original


def run(input):
    out = original(input)
    for edge in out["causal_graph"]["edges"]:
        edge["instantaneous"] = True
    return out
