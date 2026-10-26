"""Without --json, commands other than validate print their problems on standard output."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original


def run(input):
    out = original(input)
    if "--json" not in input["argv"] and out["stderr_has_issues"] and input["argv"][0] != "validate":
        out.update(stdout_kind="text", stderr_has_issues=False)
    return out
