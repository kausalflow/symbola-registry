"""Events due together are applied transitions first, then interventions (the original: interventions first)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original


def run(input):
    out = original(input)
    groups = {}
    for event in out["events"]:
        groups.setdefault((event["applied_at"], event["target"], event["lane"]), []).append(event)
    for group in groups.values():
        if len(group) > 1 and any(e["label"].startswith("transition") for e in group) and any(e["label"] == "planned" for e in group):
            planned = [e for e in group if e["label"] == "planned"]
            moved = [e for e in group if e["label"] != "planned"]
            held = moved[0]["value_before"]
            for e in moved + planned:
                before = held
                e["value_after"] = e["value"] if e["action"] == "set" else (before + e["value"] if e["action"] == "shift" else before * e["value"])
                e["value_before"] = before
                held = e["value_after"]
    return out
