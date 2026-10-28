"""The token marks in profile list are swapped."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    out = original(input)
    if input["argv"][:2] == ["profile", "list"]:
        out["stdout"] = out["stdout"].replace("✓", "\0").replace("✗", "✓").replace("\0", "✗")
    return out
