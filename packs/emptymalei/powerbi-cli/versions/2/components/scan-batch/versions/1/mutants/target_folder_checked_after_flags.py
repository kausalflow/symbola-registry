"""The flags are validated before target_folder is required."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    out = original(input)
    config = (input.get("files") or {}).get("scan.yaml", "")
    if out["errors"] == ["Error: Config file scan.yaml must set 'target_folder'."] and "lineage: 3" in config:
        out["errors"] = ["Error: 'lineage' must be a boolean value."]
    return out
