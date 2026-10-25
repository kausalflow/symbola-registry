"""Oracle for run-series: the original homeostat run, returning the recorded values of chosen signals."""

import math

from homeostat.core.errors import HomeostatError
from homeostat.scenario.loader import prepare


def run(input):
    try:
        result = prepare(input["scenario"]).run()
    except HomeostatError as exc:
        raise ValueError("; ".join(f"[{i.code}] {i.location}" for i in exc.issues)) from None
    known = set(result.meta["signals"].index)
    missing = [s for s in input["signals"] if s not in known]
    if missing:
        raise ValueError(f"no signal {missing[0]}")
    values = {}
    for signal in input["signals"]:
        lanes = []
        for lane in range(result.lanes):
            column = result.frame([signal], lane=lane)[signal].to_numpy(dtype=float)
            lanes.append([None if math.isnan(v) else float(v) for v in column])
        values[signal] = lanes
    return {"seconds": [float(s) for s in result.seconds], "values": values}
