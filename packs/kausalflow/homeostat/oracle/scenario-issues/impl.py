"""Oracle for scenario-issues: the original homeostat validation, reduced to codes and locations."""

import json
import re

from homeostat.core.errors import HomeostatError
from homeostat.scenario.loader import prepare

_NAMES = re.compile(r"Did you mean ((?:'[^']*'(?:, )?)+)")


def _location(issue):
    """An algebraic loop is reported as a closed path; the original starts it anywhere, so rotate it to begin at the smallest id."""
    if issue.code != "E_ALGEBRAIC_LOOP":
        return issue.location
    ring = issue.location.split(" -> ")[:-1]
    start = ring.index(min(ring))
    ring = ring[start:] + ring[:start]
    return " -> ".join([*ring, ring[0]])


def _error(issue):
    found = _NAMES.search(issue.fix)
    return {
        "code": issue.code,
        "location": _location(issue),
        "has_fix": bool(issue.fix),
        "suggestion": re.findall(r"'([^']*)'", found.group(1))[0] if found else None,
    }


def run(input):
    if input.get("text") is not None:
        source = input["text"]
    else:
        source = input["scenario"]
        if not isinstance(source, dict):
            source = json.dumps(source)
    try:
        prepared = prepare(source)
    except HomeostatError as exc:
        errors = sorted((_error(i) for i in exc.issues), key=lambda e: (e["location"], e["code"]))
        return {"ok": False, "errors": errors, "warnings": []}
    warnings = sorted(({"code": w.code, "location": w.location} for w in prepared.warnings), key=lambda w: (w["location"], w["code"]))
    return {"ok": True, "errors": [], "warnings": warnings}
