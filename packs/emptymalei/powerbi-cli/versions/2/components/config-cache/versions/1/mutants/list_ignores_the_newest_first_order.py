"""Versions are listed oldest first."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    out = original(input)
    if input["argv"][:3] == ["cache", "list", "-k"] and out["stdout"].startswith("Cached versions"):
        head, *versions = out["stdout"].splitlines()
        out["stdout"] = "\n".join([head, *reversed(versions)])
    return out
