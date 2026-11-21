"""Deleting a profile leaves its token in the credentials file."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

import json


def run(input):
    out = original(input)
    if input["argv"][:2] == ["profile", "delete"] and ".pbi_cli/credentials.json" in out["files"]:
        out["files"][".pbi_cli/credentials.json"] = json.loads(input["files"][".pbi_cli/credentials.json"])
    return out
