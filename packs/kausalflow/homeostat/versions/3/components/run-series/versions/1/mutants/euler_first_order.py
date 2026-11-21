"""First-order dynamics use the explicit Euler step y += dt/tau (K u - y), so the response depends on dt."""
import sys
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

import numpy as np
from homeostat.core.operators.dynamic import FirstOrder


def _update(self, s, u, p, eps, t, y):
    return {"y": s["y"] + self.dt / np.maximum(p["tau"], 1e-300) * (p["K"] * u["u"] - s["y"])}


def run(input):
    with mock.patch.object(FirstOrder, "update", _update):
        return original(input)
