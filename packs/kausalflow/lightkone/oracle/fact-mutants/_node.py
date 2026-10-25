"""Shared helper for fact mutants: lightkone's bundled oracle with one rule broken.

A fact mutant breaks one rule that a component's description states. If the
pack's examples and properties still pass, only the prose carries that rule.
"""

import tempfile
from pathlib import Path

from symbola.spec import CommandImpl

oracle = Path(__file__).resolve().parents[1]


def patched(component: str, edits: list[tuple[str, str]]) -> CommandImpl:
    """The oracle for component, with each (old, new) replaced exactly once."""
    src = (oracle / component / "impl.mjs").read_text()
    for old, new in edits:
        if src.count(old) != 1:
            raise ValueError(f"{component}: expected {old!r} exactly once, found {src.count(old)}")
        src = src.replace(old, new)
    tmp = Path(tempfile.mkdtemp(prefix=f"mutant-{component}-")) / "impl.mjs"
    tmp.write_text(src)
    return CommandImpl(["node", str(tmp)], cwd=tmp.parent)
