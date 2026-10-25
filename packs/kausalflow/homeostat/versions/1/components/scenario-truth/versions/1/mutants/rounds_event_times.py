"""An event is applied at the nearest step instead of the first step at or after its time."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original


def run(input):
    out = original(input)
    scenario = input["scenario"]
    dt = {"10s": 10.0}.get(scenario.get("dt"), 10.0)
    for event in out["events"]:
        event["applied_at"] = round(event["at"] / dt) * dt
    out["events"] = [e for e in out["events"] if e["applied_at"] < 1200.0]
    out["events"].sort(key=lambda e: (e["applied_at"], e["id"], e["lane"]))
    return out
