"""format-convert refuses a target that is not named .xlsx."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    out = original(input)
    if input["argv"][:2] == ["workspaces", "format-convert"] and not input["argv"][input["argv"].index("-t") + 1].endswith(".xlsx"):
        return {"ok": False, "files": {}}
    return out
