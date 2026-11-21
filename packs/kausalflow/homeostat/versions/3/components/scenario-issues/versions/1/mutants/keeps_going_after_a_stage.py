"""All stages are reported together: an unknown operator no longer hides the problems of later stages."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

import copy


def run(input):
    out = original(input)
    scenario = input.get("scenario")
    if out["ok"] or not isinstance(scenario, dict) or not any(e["code"] == "E_UNKNOWN_OP" for e in out["errors"]):
        return out
    rest = copy.deepcopy(scenario)
    bad = {e["location"].split("]")[0] + "]" for e in out["errors"] if e["code"] == "E_UNKNOWN_OP"}
    rest["custom"] = [c for i, c in enumerate(rest["custom"]) if f"custom[{i}]" not in bad]
    more = original({"scenario": rest})
    seen = {(e["location"], e["code"]) for e in out["errors"]}
    out["errors"] += [e for e in more["errors"] if (e["location"], e["code"]) not in seen]
    out["errors"].sort(key=lambda e: (e["location"], e["code"]))
    return out
