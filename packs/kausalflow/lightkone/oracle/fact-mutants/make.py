"""Write one mutant file per fact listed in facts/<component>.py, then run them.

    python make.py bibtex-export      # writes <component>/*.py, runs `symbola mutants`

Each facts file defines FACTS = [(name, concern, [(old, new), ...]), ...]:
a rule the component's description states, and the edit to lightkone's
bundled code that breaks it. An optional fourth item says why the mutant
behaves like lightkone anyway (the rule has no observable effect). A surviving mutant is a fact that only the
prose carries: record an example for it before cutting the prose.
"""

import runpy
import subprocess
import sys
from pathlib import Path

here = Path(__file__).resolve().parent
name = sys.argv[1]
facts = runpy.run_path(str(here / "facts" / f"{name}.py"))["FACTS"]
out = here / name
out.mkdir(exist_ok=True)
for old in out.glob("*.py"):
    old.unlink()
(out / "_node.py").symlink_to("../_node.py")
for fact, concern, edits, *survives in facts:
    marker = f"SURVIVES = {survives[0]!r}\n\n" if survives else ""
    (out / f"{fact}.py").write_text(
        f'{concern!r}\n\nfrom _node import patched\n\n{marker}_impl = patched({name!r}, {edits!r})\n\n\n'
        "def run(input):\n    return _impl(input)\n"
    )
contract = here.parent.parent / "versions" / "1" / "components" / name / "versions" / "1"
sys.exit(subprocess.call(["symbola", "mutants", str(contract), "--mutants", str(out), *sys.argv[2:]]))
