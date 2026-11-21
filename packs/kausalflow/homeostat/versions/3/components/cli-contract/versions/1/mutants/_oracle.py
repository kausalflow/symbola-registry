"""The original `homeostat` command, driven like any cli implementation, so that mutants can wrap it."""

import importlib.util
from pathlib import Path

from symbola.spec import CliImpl

_path = Path(__file__).resolve().parents[1] / "observe.py"
_spec = importlib.util.spec_from_file_location("_observe_cli_contract", _path)
_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_module)
original = CliImpl(["homeostat"], cwd=Path.cwd(), observe=_module.observe)
