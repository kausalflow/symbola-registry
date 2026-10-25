"""With --json, a failure is printed as issue lines on standard error and standard output is empty."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original


def run(input):
    out = original(input)
    if "--json" in input["argv"] and out["exit_code"] == 1 and input["argv"][0] != "validate" and out["stdout_kind"] == "json":
        out.update(stdout_kind="empty", json_keys=None, ok=None, stderr_has_issues=True)
    return out
