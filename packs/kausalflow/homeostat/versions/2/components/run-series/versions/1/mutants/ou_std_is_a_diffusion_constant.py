"""The OU source takes std as a diffusion constant (increments of std*sqrt(dt)): its stationary spread depends on tau and dt."""
import sys
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

import numpy as np
from homeostat.core.operators.sources import OU


def _update(self, s, u, p, eps, t, y):
    a = np.exp(-self.dt / np.maximum(p["tau"], 1e-300))
    return {"x": p["mean"] + (s["x"] - p["mean"]) * a + p["std"] * np.sqrt(self.dt) * eps[:, 0]}


def run(input):
    with mock.patch.object(OU, "update", _update):
        return original(input)
