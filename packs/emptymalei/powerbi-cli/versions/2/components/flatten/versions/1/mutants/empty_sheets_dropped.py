"""Sheets without rows are left out instead of being present and empty."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

def run(input):
    out = original(input)
    if input["kind"] != "report_users":
        out["sheets"] = {k: v for k, v in out["sheets"].items() if v}
    return out
