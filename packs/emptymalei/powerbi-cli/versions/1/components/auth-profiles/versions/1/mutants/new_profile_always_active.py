"""A newly added ungrouped profile always becomes the active one."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    out = original(input)
    argv = input["argv"]
    if argv[:1] == ["auth"] and "-g" not in argv and ".pbi_cli/config.yaml" in out["files"]:
        profile = argv[argv.index("-p") + 1] if "-p" in argv else "default"
        out["files"][".pbi_cli/config.yaml"]["active_profile"] = profile
    return out
