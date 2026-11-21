"""A version is any subdirectory, whether or not it holds <key>.json."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    out = original(input)
    if input["op"] == "index":
        for path in input["files"]:
            parts = path.split("/")
            if len(parts) == 3 and parts[2] != parts[0] + ".json":
                out["versions"].setdefault(parts[0], [])
                if parts[1] not in out["versions"][parts[0]]:
                    out["versions"][parts[0]] = sorted([*out["versions"][parts[0]], parts[1]], reverse=True)
        out["keys"] = sorted(k for k, v in out["versions"].items() if v)
        out["latest"] = {k: (v[0] if v else None) for k, v in out["versions"].items()}
    return out
