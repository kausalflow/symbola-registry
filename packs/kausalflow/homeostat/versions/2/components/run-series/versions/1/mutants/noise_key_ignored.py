"""Lanes get independent noise whatever noise_keys says (twin runs cannot be made)."""
import sys
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).parent))
from _oracle import original

import numpy as np
from homeostat.core import rng

_stream = rng.stream


def run(input):
    seen = {}

    def stream(seed, path, noise_key=0):
        seen[(path, noise_key)] = seen.get((path, noise_key), 0)
        return _stream(seed, path, noise_key + 1000 * len(seen))

    with mock.patch.object(rng, "stream", stream):
        return original(input)
