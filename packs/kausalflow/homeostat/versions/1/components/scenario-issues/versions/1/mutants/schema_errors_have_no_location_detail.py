"""Schema problems are all located at the top of the scenario instead of at the offending key."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original


def run(input):
    out = original(input)
    for error in out["errors"]:
        if error["code"] == "E_SCHEMA" and error["location"] != "scenario":
            error["location"] = error["location"].split(".")[0].split("[")[0]
    out["errors"] = sorted({(e["location"], e["code"]): e for e in out["errors"]}.values(), key=lambda e: (e["location"], e["code"]))
    return out
