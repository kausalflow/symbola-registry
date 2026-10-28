"""Writes a component's symbolon.toml (from the description in oracle/desc/<name>.md) and its oracle manifest.

    python oracle/scaffold.py merge "Title"
"""
import subprocess
import sys
from pathlib import Path

here = Path(__file__).resolve().parent
name, title = sys.argv[1], sys.argv[2]
d = here.parent / "versions" / "1" / "components" / name / "versions" / "1"
d.mkdir(parents=True, exist_ok=True)
desc = (here / "desc" / f"{name}.md").read_text().strip()
assert "'''" not in desc
extra = ""
if len(sys.argv) > 3:
    extra = sys.argv[3] + "\n"
(d / "symbolon.toml").write_text(f"""[contract]
id = "spikinglabs/{name}"
version = 1
title = "{title}"
description = '''
{desc}
'''
regenerability = "disposable"
license = "Apache-2.0"
authors = ["spikinglabs/aura"]

[entrypoint]
function = "run"

[requires]
network = []
credentials = []
state = []
permissions = []

[spec]
seed = 0
max_examples = 60
{extra}""")
