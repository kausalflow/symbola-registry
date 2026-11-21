"""Loads the publisher's oracle adapter (oracle/run-series) so that mutants can wrap the original product."""

import importlib.util
from pathlib import Path

_path = Path(__file__).resolve().parents[7] / "oracle" / "run-series" / "impl.py"
_spec = importlib.util.spec_from_file_location("_oracle_run_series", _path)
_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_module)
original = _module.run
