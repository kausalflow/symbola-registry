"""An event due exactly at the end of the run is not warned about (the original warns: it never happens)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original


def run(input):
    out = original(input)
    scenario = input.get("scenario")
    if isinstance(scenario, dict):
        end = {"10min": 600}.get(scenario.get("duration"))
        late = {f"interventions[{i}]" for i, e in enumerate(scenario.get("interventions") or []) if isinstance(e, dict) and e.get("at") in ("10min", 600)}
        if end:
            out["warnings"] = [w for w in out["warnings"] if not (w["code"] == "W_EVENT_AFTER_END" and w["location"] in late)]
    return out
