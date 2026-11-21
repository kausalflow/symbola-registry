"""Switching certificate verification off is silent, like switching it on."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    out = original(input)
    if out["stdout"].startswith("! Certificate verification disabled"):
        out["stdout"] = "✓ Verify certificates: False"
    return out
