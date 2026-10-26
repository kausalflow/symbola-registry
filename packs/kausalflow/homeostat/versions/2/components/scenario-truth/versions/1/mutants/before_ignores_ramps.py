"""value_before of an event is the previous event's final value, ignoring a ramp still in progress."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original


def run(input):
    out = original(input)
    last = {}
    for event in sorted(out["events"], key=lambda e: (e["lane"], e["at"])):
        key = (event["lane"], event["target"])
        if key in last and event["value_before"] is not None:
            shift = event["value_after"] - event["value_before"]
            event["value_before"] = last[key]
            if event["action"] == "shift":
                event["value_after"] = last[key] + shift
        last[key] = event["value_after"]
    return out
