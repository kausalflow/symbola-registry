"""Loads the publisher's oracle adapter (oracle/scenario-issues) so that mutants can wrap the original product."""

import importlib.util
from pathlib import Path

_path = Path(__file__).resolve().parents[7] / "oracle" / "scenario-issues" / "impl.py"
_spec = importlib.util.spec_from_file_location("_oracle_scenario_issues", _path)
_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_module)
original = _module.run
