"""An entry that is not usable is skipped instead of making the input invalid."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    ids = input["workspace_ids"]
    if isinstance(ids, list):
        input = {"workspace_ids": [e for e in ids if isinstance(e, str) or (isinstance(e, dict) and e.get("id"))]}
    return original(input)
