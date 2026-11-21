"""The historian view includes the manual output of each loop."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original


def run(input):
    out = original(input)
    for signal in out["signals"]:
        if any(r["role"] == "manual" for r in signal["roles"]):
            signal["observed"] = True
    return out
