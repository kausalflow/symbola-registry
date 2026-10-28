"""A source that is not a JSON object is treated as having no apps."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

import json


def run(input):
    files = dict(input.get("files") or {})
    for path, text in list(files.items()):
        if path.endswith(".json") and not path.startswith(".pbi_cli"):
            try:
                if not isinstance(json.loads(text), dict):
                    files[path] = "{}"
            except ValueError:
                pass
    return original({**input, "files": files})
