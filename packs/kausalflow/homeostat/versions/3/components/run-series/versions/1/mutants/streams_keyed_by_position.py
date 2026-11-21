"""Random streams are keyed by the order in which operators ask for them, so adding an operator reshuffles the others."""
import sys
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

from homeostat.core import rng


def run(input):
    order = {}

    def key(path):
        return order.setdefault(path, len(order))

    with mock.patch.object(rng, "path_key", key):
        return original(input)
