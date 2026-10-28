"""A 0 or 1 is accepted where a flag is expected."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

import re


def run(input):
    files = dict(input.get("files") or {})
    if "scan.yaml" in files:
        files["scan.yaml"] = re.sub(r"^(lineage|datasource_details|dataset_schema|dataset_expressions|get_artifact_users): [01]$", lambda m: m.group(1) + ": " + ("true" if m.group(0).endswith("1") else "false"), files["scan.yaml"], flags=re.M)
    return original({**input, "files": files})
