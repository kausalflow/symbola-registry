"""An unreadable latest version is skipped in favour of an older readable one."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

import json


def run(input):
    files = dict(input.get("files") or {})
    for path, text in list(files.items()):
        if path.endswith(".json"):
            try:
                json.loads(text)
            except ValueError:
                del files[path]
    return original({**input, "files": files})
