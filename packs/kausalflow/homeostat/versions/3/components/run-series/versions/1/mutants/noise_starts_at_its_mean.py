"""OU and AR sources start at their mean instead of a draw from their stationary distribution ("a run starts settled, noise off"); no single run shows it."""
import sys
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

from homeostat.core.operators.sources import AR, OU


def run(input):
    with mock.patch.object(OU, "draw_state", lambda self, s, p, z: self.settle_state(s, p)), \
         mock.patch.object(AR, "draw_state", lambda self, s, p, z: self.settle_state(s, p)):
        return original(input)
