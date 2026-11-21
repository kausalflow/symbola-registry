"""The original pbi code, driven through the oracle adapter, so that mutants can wrap it."""

import os
from pathlib import Path

from symbola.spec import CommandImpl

_adapter = Path(__file__).resolve().parents[7] / "oracle" / "cache-keys"
original = CommandImpl([os.environ.get("PBI_PYTHON", "python3"), "-I", "adapter.py"], cwd=_adapter)
