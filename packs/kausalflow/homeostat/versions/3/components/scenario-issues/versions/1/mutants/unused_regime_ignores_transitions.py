"""A regime counts as used only when it is the starting regime (a transition into it does not use it)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original



def run(input):
    out = original(input)
    scenario = input.get("scenario")
    if isinstance(scenario, dict) and out["ok"] and isinstance(scenario.get("regimes"), dict):
        start = (scenario.get("plan") or {}).get("start")
        known = {w["location"] for w in out["warnings"]}
        for name in scenario["regimes"]:
            if name != start and f"regimes.{name}" not in known:
                out["warnings"].append({"code": "W_UNUSED_REGIME", "location": f"regimes.{name}"})
        out["warnings"].sort(key=lambda w: (w["location"], w["code"]))
    return out
