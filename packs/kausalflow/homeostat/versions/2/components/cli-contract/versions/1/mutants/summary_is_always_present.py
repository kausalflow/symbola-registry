"""validate --json keeps the summary even for an invalid scenario (the original: null)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original


def run(input):
    out = original(input)
    if out["summary"] is None and out["json_keys"] == ["errors", "file", "ok", "summary", "warnings"]:
        out["summary"] = {}
    return out
