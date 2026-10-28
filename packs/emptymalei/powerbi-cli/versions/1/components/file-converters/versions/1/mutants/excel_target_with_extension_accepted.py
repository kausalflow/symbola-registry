"""An excel target with a file extension is accepted (the extension is dropped)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

import os


def run(input):
    argv = list(input["argv"])
    if "excel" in argv and "-t" in argv:
        i = argv.index("-t") + 1
        argv[i] = os.path.splitext(argv[i])[0]
    return original({**input, "argv": argv})
