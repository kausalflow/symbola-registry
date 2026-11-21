"""`cache clear -v V` without a key clears everything instead of refusing."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    argv = input["argv"]
    out = original(input)
    if argv[:2] == ["cache", "clear"] and ("-v" in argv or "--version" in argv) and "-k" not in argv and "--cache-key" not in argv:
        out["stdout"] = "✓ Cleared entire cache"
    return out
