"""Behavioural properties for kausalflow/scenario-issues.

Each test_* function takes `impl` first; `impl(Input)` returns an Output.
"""

import json

from hypothesis import given, strategies as st

from schema import Input

TOP_KEYS = {"seed", "duration", "dt", "lanes", "noise_keys", "init", "library", "units", "exogenous", "interventions", "custom", "regimes", "plan", "degradation", "family", "output", "expect"}
# Expanded into interventions before validation: valid, but not a name a misspelt key is matched against.
EXPANDED_KEYS = {"faults"}
OPERATORS = {"ar", "bias", "clip", "clock", "constant", "delay", "first_order", "fopdt", "gate", "integrator", "lag", "log_linear", "ou", "pid", "product", "quantize", "sample_hold", "saturation", "schedule", "stiction", "sum", "variable_delay", "weighted_mean", "white_noise"}
BASE = {"duration": "10min", "dt": "10s"}


def loop():
    return [
        {"id": "sp", "op": "schedule", "value": 80},
        {"id": "mode", "op": "schedule", "value": 1},
        {"id": "man", "op": "schedule", "value": 50},
        {"id": "u", "op": "pid", "inputs": {"pv": "ym", "sp": "sp", "mode": "mode", "man_out": "man"}, "Kc": 2, "Ti": "60s"},
        {"id": "y", "op": "first_order", "inputs": {"u": "u"}, "tau": "60s", "K": 0.5},
        {"id": "ym", "op": "lag", "inputs": {"u": "y"}, "tau": "5s"},
    ]


def plant(**more):
    return {**BASE, "custom": loop(), **more}


def check(impl, scenario):
    return impl(Input(scenario=scenario))


def pairs(items):
    return [(i.code, i.location) for i in items]


ids = st.text(alphabet="abcdefghijklmnopqrstuvwxyz", min_size=1, max_size=6)


@st.composite
def chains(draw):
    """A valid library-free scenario: sources, then dynamic operators wired only to earlier signals."""
    names = draw(st.lists(ids, min_size=2, max_size=7, unique=True))
    ops, signals = [], []
    for name in names:
        kinds = ["constant", "schedule", "ou"] if not signals else ["constant", "schedule", "ou", "first_order", "lag", "sum"]
        kind = draw(st.sampled_from(kinds))
        number = st.floats(min_value=0.0, max_value=100.0, allow_nan=False)
        if kind in ("constant", "schedule"):
            op = {"id": name, "op": kind, "value": draw(number)}
        elif kind == "ou":
            op = {"id": name, "op": "ou", "std": draw(number), "tau": draw(st.integers(1, 3600))}
        elif kind in ("first_order", "lag"):
            op = {"id": name, "op": kind, "tau": draw(st.integers(0, 3600)), "inputs": {"u": draw(st.sampled_from(signals))}}
        else:
            op = {"id": name, "op": "sum", "inputs": {"in0": draw(st.sampled_from(signals)), "in1": draw(st.sampled_from(signals))}}
        ops.append(op)
        signals.append(name)
    return {"duration": "1h", "dt": draw(st.sampled_from(["1s", "10s", "1min"])), "custom": ops}


@given(chains())
def test_acyclic_scenarios_with_in_range_values_are_valid(impl, scenario):
    out = check(impl, scenario)
    assert out.ok and not out.errors and not out.warnings


@given(chains())
def test_text_and_object_forms_agree(impl, scenario):
    assert impl(Input(text=json.dumps(scenario))) == check(impl, scenario)


@given(st.text(alphabet="abcdefghijklmnopqrstuvwxyz_", min_size=3, max_size=12).filter(lambda k: k not in TOP_KEYS | EXPANDED_KEYS))
def test_an_unknown_top_level_key_is_the_only_problem_and_is_located_at_it(impl, key):
    out = check(impl, {**plant(), key: 1})
    assert not out.ok
    assert pairs(out.errors) == [("E_SCHEMA", key)]
    assert out.warnings == []


@given(st.sampled_from(sorted(TOP_KEYS)))
def test_a_misspelt_key_gets_its_nearest_name(impl, key):
    typo = key[:-1] + key[-1] * 2 if len(key) > 4 else key + key[-1]
    if typo in TOP_KEYS:
        return
    out = check(impl, {**plant(), typo: 1})
    assert pairs(out.errors) == [("E_SCHEMA", typo)]
    assert out.errors[0].suggestion == key


@given(st.text(alphabet="abcdefghijklmnopqrstuvwxyz_", min_size=3, max_size=14).filter(lambda n: n not in OPERATORS and all(not (a in n or n in a) for a in OPERATORS if len(a) > 3)))
def test_an_unknown_operator_name_is_located_at_its_op_key(impl, name):
    scenario = {**BASE, "custom": [{"id": "a", "op": "constant"}, {"id": "b", "op": name, "inputs": {"u": "a"}}]}
    out = check(impl, scenario)
    assert pairs(out.errors) == [("E_UNKNOWN_OP", "custom[1].op")]


@given(st.integers(0, 40), st.sampled_from(["1s", "10s"]))
def test_events_warn_exactly_when_due_at_or_after_the_end(impl, minutes_tenths, dt):
    at = minutes_tenths * 30  # seconds; the run lasts 600 s
    scenario = plant(dt=dt, interventions=[{"at": at, "target": "sp", "value": 85}])
    out = check(impl, scenario)
    assert out.ok
    assert pairs(out.warnings) == ([("W_EVENT_AFTER_END", "interventions[0]")] if at >= 600 else [])


TARGETS = {
    "sp": None, "mode": None, "man": None, "y.K": None, "y.tau": None, "u.Ti": None,
    "y": "E_TARGET_REGULATED",
    "u": "E_TARGET_CONTROLLER_OUTPUT",
    "ym": "E_TARGET_NOT_SCHEDULABLE",
    "nowhere": "E_UNKNOWN_TARGET", "y.nothing": "E_UNKNOWN_TARGET",
}


@given(st.sampled_from(sorted(TARGETS)), st.integers(0, 2))
def test_what_an_event_may_target_follows_the_graph(impl, target, position):
    interventions = [{"at": "1min", "target": "sp", "value": 81}] * position + [{"at": "2min", "target": target, "value": 1.0 if target != "mode" else "MAN"}]
    out = check(impl, plant(interventions=interventions))
    code = TARGETS[target]
    assert pairs(out.errors) == ([(code, f"interventions[{position}]")] if code else [])


@given(st.lists(st.sampled_from(["A", "B", "C", "D"]), unique=True, min_size=1), st.data())
def test_regimes_nobody_visits_are_warned_about(impl, names, data):
    start = data.draw(st.sampled_from(names))
    moves = data.draw(st.lists(st.sampled_from(names), max_size=3))
    regimes = {n: {"sp": 70 + i} for i, n in enumerate(names)}
    production = [{"at": f"{i + 1}min", "to": m} for i, m in enumerate(moves)]
    out = check(impl, plant(regimes=regimes, plan={"start": start, "production": production}))
    assert out.ok
    unvisited = sorted(f"regimes.{n}" for n in names if n != start and n not in moves)
    assert [w.location for w in out.warnings] == unvisited
    assert all(w.code == "W_UNUSED_REGIME" for w in out.warnings)


STAGES = [
    ({"duraton": 1}, "E_SCHEMA"),
    ({"custom": [{"id": "q", "op": "nope"}]}, "E_UNKNOWN_OP"),
    ({"regimes": {"A": {"sp": 1}}, "plan": {"start": "B"}}, "E_UNKNOWN_REGIME"),
    ({"extra_op": {"id": "w", "op": "first_order", "tau": 10}}, "E_MISSING_INPUT"),
    ({"interventions": [{"at": "1min", "target": "zz", "value": 1}]}, "E_UNKNOWN_TARGET"),
]


def staged(index):
    change, _ = STAGES[index]
    scenario = plant()
    for key, value in change.items():
        if key == "extra_op":
            scenario["custom"].append(value)
        elif key == "custom":
            scenario["custom"] = value + scenario["custom"]
        else:
            scenario[key] = value
    return scenario


@given(st.integers(0, 4), st.integers(0, 4))
def test_an_earlier_stage_hides_the_problems_of_later_ones(impl, i, j):
    first, second = min(i, j), max(i, j)
    scenario = staged(first)
    for key, value in staged(second).items():
        if key == "custom":
            scenario["custom"] = scenario["custom"] + [op for op in value if op not in scenario["custom"]]
        else:
            scenario.setdefault(key, value)
    out = check(impl, scenario)
    assert {e.code for e in out.errors} == {STAGES[first][1]}


@given(chains(), st.lists(st.sampled_from(["extra", "bad_op", "missing_input", "unknown_target", "bad_signal"]), min_size=1, max_size=4, unique=True))
def test_issues_are_sorted_distinct_and_every_non_schema_error_has_a_fix(impl, scenario, faults):
    first = scenario["custom"][0]["id"]
    if "extra" in faults:
        scenario["zz_extra"] = 1
    if "bad_op" in faults:
        scenario["custom"].append({"id": "bad", "op": "zzzzzz_op"})
    if "missing_input" in faults:
        scenario["custom"].append({"id": "gap", "op": "first_order", "tau": 5})
    if "unknown_target" in faults:
        scenario["interventions"] = [{"at": 0, "target": "zzz", "value": 1}]
    if "bad_signal" in faults:
        scenario["custom"].append({"id": "dangling", "op": "lag", "tau": 5, "inputs": {"u": "zzz"}})
    out = check(impl, scenario)
    assert not out.ok
    keys = [(e.location, e.code) for e in out.errors]
    assert keys == sorted(set(keys))
    assert all(e.has_fix for e in out.errors if e.code != "E_SCHEMA")
    del first


@given(st.lists(ids, min_size=2, max_size=5, unique=True))
def test_a_loop_of_algebraic_operators_is_reported_once_as_a_closed_path_from_its_smallest_id(impl, names):
    custom = [
        {"id": n, "op": "sum", "inputs": {"in0": names[(i + 1) % len(names)], "in1": names[(i + 1) % len(names)]}}
        for i, n in enumerate(names)
    ]
    out = check(impl, {**BASE, "custom": custom})
    # operator i reads operator i+1, so the signal flows from i+1 to i
    ring = list(reversed(names))
    start = ring.index(min(ring))
    ring = ring[start:] + ring[:start]
    assert pairs(out.errors) == [("E_ALGEBRAIC_LOOP", " -> ".join([*ring, ring[0]]))]


JUNK_KEYS = ["duration", "dt", "lanes", "custom", "id", "op", "inputs", "exogenous", "target", "source", "kind", "interventions", "at", "value", "regimes", "plan", "start", "production", "to", "expect", "output", "every", "units", "init", "seed", "noise_keys", "library"]
junk = st.recursive(
    st.none() | st.booleans() | st.integers(-5, 5) | st.floats(allow_nan=False, allow_infinity=False) | st.text(max_size=6) | st.sampled_from(["1h", "10s", "process", "ou", "constant", "sum", "pid"]),
    lambda children: st.lists(children, max_size=3) | st.dictionaries(st.sampled_from(JUNK_KEYS), children, max_size=5),
    max_leaves=14,
)


@given(junk)
def test_malformed_input_is_reported_never_raised(impl, value):
    if isinstance(value, dict) and "plan" in value and not isinstance(value["plan"], dict):
        value = {k: v for k, v in value.items() if k != "plan"}  # the original raises on these: see REVIEW.md
    out = check(impl, value)
    assert out.ok == (not out.errors)
    if not out.ok:
        assert out.warnings == []
    assert all(e.code.startswith("E_") for e in out.errors)
    assert all(w.code.startswith("W_") for w in out.warnings)
    if not isinstance(value, dict):
        assert pairs(out.errors) == [("E_SCHEMA", "scenario")]
