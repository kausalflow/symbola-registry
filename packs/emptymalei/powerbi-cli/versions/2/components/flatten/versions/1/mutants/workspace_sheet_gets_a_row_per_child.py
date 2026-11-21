"""The workspace sheet repeats a workspace once per child row instead of once."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    out = original(input)
    if input["kind"] == "workspaces":
        out["sheets"]["workspace"] = [row for row in out["sheets"]["workspace"] for _ in range(max(1, len(next((w.get("users", []) for w in input["data"] if w.get("id") == row.get("id")), []))))]
    return out
