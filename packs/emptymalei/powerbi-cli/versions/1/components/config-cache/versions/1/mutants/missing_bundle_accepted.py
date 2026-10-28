"""A CA bundle path is stored without checking that the file exists."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    argv = input["argv"]
    if argv[:2] == ["config", "set-verify-certificates"] and argv[2].lower() not in ("true", "false"):
        input = {**input, "files": {**input.get("files", {}), argv[2]: "-----BEGIN CERTIFICATE-----\n"}}
        out = original(input)
        out["files"].pop(argv[2], None)
        return out
    return original(input)
