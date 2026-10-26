"""Every observation operator's output is measured, not only the end of a chain."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original


def run(input):
    out = original(input)
    for signal in out["signals"]:
        if signal["level"] == "internal":
            signal["level"] = "measured"
            signal["roles"] = [{"role": "measured", "loop": ""}]
    return out
