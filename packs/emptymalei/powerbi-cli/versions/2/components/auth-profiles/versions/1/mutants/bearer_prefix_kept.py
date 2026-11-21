"""A token given as `Bearer <token>` is stored with the prefix."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    out = original(input)
    if input["argv"][:1] == ["auth"] and input["argv"][2].startswith("Bearer "):
        creds = out["files"][".pbi_cli/credentials.json"]
        creds[input["argv"][4]] = input["argv"][2]
    return out
