"""An empty source needs no token."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    files = dict(input.get("files") or {})
    files.setdefault(".pbi_cli/config.yaml", "groups:\n  user:\n    active_profile: u\n    profiles:\n      u:\n        name: u\n")
    files.setdefault(".pbi_cli/credentials.json", '{"u": "t"}')
    out = original({**input, "files": files})
    out["files"] = {k: v for k, v in out["files"].items() if not k.startswith(".pbi_cli")}
    return out
