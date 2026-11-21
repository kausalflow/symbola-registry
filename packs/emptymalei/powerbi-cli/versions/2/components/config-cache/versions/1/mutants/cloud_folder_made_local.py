"""A cloud cache location is treated like a local path and made absolute."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    out = original(input)
    if input["argv"][:2] == ["config", "set-cache-folder"]:
        value = out["files"][".pbi_cli/config.yaml"]["cache_folder"]
        if "://" in value:
            out["files"][".pbi_cli/config.yaml"]["cache_folder"] = "<scratch>/" + value.replace("//", "/")
    return out
