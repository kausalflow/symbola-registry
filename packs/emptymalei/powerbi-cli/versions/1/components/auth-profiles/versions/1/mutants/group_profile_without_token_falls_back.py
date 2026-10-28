"""A group profile without a token falls back to the ungrouped profile instead of failing."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

import json


def run(input):
    out = original(input)
    files = input.get("files") or {}
    creds = json.loads(files.get(".pbi_cli/credentials.json", "{}"))
    if out["exit_code"] == 1 and any("No credentials found for profile" in e for e in out["errors"]) and input["argv"][0] == "apps":
        # the ungrouped active profile, when it has a token
        import re
        match = re.search(r"^active_profile: (\S+)$", files.get(".pbi_cli/config.yaml", ""), re.M)
        if match and match.group(1) in creds:
            return {"exit_code": 0, "stdout": "", "errors": [], "files": {"o.json": []}}
    return out
