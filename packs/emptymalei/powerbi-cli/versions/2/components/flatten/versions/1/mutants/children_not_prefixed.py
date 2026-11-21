"""Child fields keep their own names instead of `<child>_<field>`."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    out = original(input)
    for name, rows in out["sheets"].items():
        if input["kind"] != "report_users" and name not in ("workspace", "app"):
            out["sheets"][name] = [{(k[len(name) + 1:] if k.startswith(name + "_") else k): v for k, v in row.items()} for row in rows]
    return out
