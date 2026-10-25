"""Oracle for scenario-truth: the original homeostat run, reduced to the deterministic ground truth in run.meta."""

import math

from homeostat.core.errors import HomeostatError
from homeostat.scenario.loader import prepare


def _num(value):
    value = float(value)
    return None if math.isnan(value) else value


def run(input):
    try:
        prepared = prepare(input["scenario"])
        result = prepared.run()
    except HomeostatError as exc:
        raise ValueError("; ".join(f"[{i.code}] {i.location}" for i in exc.issues)) from None
    meta = result.meta
    promoted = meta["promoted"]
    signals = []
    for name, row in meta["signals"].iterrows():
        roles = []
        for part in filter(None, row["roles"].split("; ")):
            role, _, loop = part.partition("@")
            roles.append({"role": role, "loop": loop})
        signals.append(
            {
                "signal": name,
                "level": row["level"],
                "observed": bool(row["observed"]),
                "unit": None if name in promoted else row["unit"],
                "writer": row["writer"],
                "writer_op": row["writer_op"],
                "kind": row["kind"],
                "roles": sorted(roles, key=lambda r: (r["role"], r["loop"])),
            }
        )
    signals.sort(key=lambda s: s["signal"])
    loops = sorted(({k: v for k, v in loop.items()} for loop in meta["loops"]), key=lambda l: l["name"])
    edges = sorted(
        ({"from": e["from"], "to": e["to"], "operator": e["operator"], "instantaneous": bool(e["instantaneous"])} for e in meta["causal_graph"]["edges"]),
        key=lambda e: (e["from"], e["to"], e["operator"]),
    )
    events = [
        {
            "id": r.id, "lane": int(r.lane), "at": float(r.at), "applied_at": float(r.applied_at), "target": r.target, "action": r.action,
            "value": _num(r.value), "profile": r.profile, "over": float(r.over), "label": r.label, "origin": r.origin,
            "value_before": _num(r.value_before), "value_after": _num(r.value_after),
        }
        for r in meta["events"].itertuples()
    ]
    events.sort(key=lambda e: (e["applied_at"], e["id"], e["lane"]))
    timeline = [
        {"start": float(r.start), "end": float(r.end), "kind": r.kind, "name": r.name, "targets": r.targets}
        for r in meta["timeline"].itertuples()
    ]
    return {
        "signals": signals,
        "loops": loops,
        "causal_graph": {"nodes": sorted(meta["causal_graph"]["nodes"]), "edges": edges},
        "events": events,
        "promoted": {path: dict(info) for path, info in sorted(promoted.items())},
        "timeline": timeline,
    }
