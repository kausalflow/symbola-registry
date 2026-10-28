"""Report users rows carry only the user fields, not the report's own fields."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original


def run(input):
    out = original(input)
    if input["kind"] == "report_users":
        key = (input.get("key") or "reports_users_value") + "_"
        out["sheets"] = {name: [{k: v for k, v in row.items() if k.startswith(key)} for row in rows] for name, rows in out["sheets"].items()}
    return out
