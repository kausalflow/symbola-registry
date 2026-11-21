"""An interval of 0 is accepted."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

import re


def run(input):
    files = dict(input.get("files") or {})
    if "scan.yaml" in files:
        files["scan.yaml"] = re.sub(r"^interval: 0$", "interval: 1", files["scan.yaml"], flags=re.M)
    return original({**input, "files": files})
