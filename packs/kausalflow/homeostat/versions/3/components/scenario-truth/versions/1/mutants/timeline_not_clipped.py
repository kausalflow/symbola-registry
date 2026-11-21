"""Timeline intervals keep their nominal end even when it lies beyond the end of the run."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original


def run(input):
    out = original(input)
    scenario = input["scenario"]
    for row in out["timeline"]:
        if row["kind"] == "transition":
            for move in (scenario.get("plan") or {}).get("production", []):
                if f"->{move['to']}" in row["name"] and abs(row["start"] - _seconds(move["at"])) < 1e-9:
                    row["end"] = row["start"] + _seconds(move.get("over", 0))
    return out


def _seconds(value):
    if isinstance(value, (int, float)):
        return float(value)
    return float(value[:-3]) * 60 if value.endswith("min") else float(value)
