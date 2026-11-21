"""Several lanes are written to one file per view, without a lane suffix."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

import re


def run(input):
    out = original(input)
    out["files_written"] = sorted({re.sub(r"\.lane\d+", "", f) for f in out["files_written"]})
    return out
