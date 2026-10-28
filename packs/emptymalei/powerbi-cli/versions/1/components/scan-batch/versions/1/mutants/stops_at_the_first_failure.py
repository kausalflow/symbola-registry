"""The loop stops at the first workspace that fails."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    out = original(input)
    lines = out["stdout"].split("\n")
    if "Failed workspaces:" in out["stdout"] and sum(1 for l in lines if l.startswith("=== Workspace")) > 1:
        first = next(i for i, l in enumerate(lines) if l.startswith("=== Workspace"))
        stop = next(i for i, l in enumerate(lines) if i > first and l.startswith("=== Workspace"))
        label = lines[first][len("=== Workspace "):-len(" ===")]
        out["stdout"] = "\n".join(lines[: stop - 1] + ["", f"Failed workspaces: {label}"])
    return out
