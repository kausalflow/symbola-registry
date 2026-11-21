"""Child rows carry only the child's own prefixed fields, not the parent's."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    out = original(input)
    if input["kind"] != "report_users":
        for name, rows in out["sheets"].items():
            if name not in ("workspace", "app"):
                out["sheets"][name] = [{k: v for k, v in row.items() if "_" in k} for row in rows]
    return out
