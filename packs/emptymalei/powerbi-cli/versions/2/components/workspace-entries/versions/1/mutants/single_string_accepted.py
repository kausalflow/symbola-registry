"""A single string is taken as one workspace id."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    if isinstance(input["workspace_ids"], str):
        input = {"workspace_ids": [input["workspace_ids"]]}
    return original(input)
