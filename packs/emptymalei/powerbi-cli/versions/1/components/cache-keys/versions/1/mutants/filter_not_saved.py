"""The request metadata leaves out the odata filter."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    out = original(input)
    if input["op"] == "key" and input["command"] == "workspaces list":
        out["metadata"].pop("filter")
    return out
