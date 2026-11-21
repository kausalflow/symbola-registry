"""Behavioural properties for kausalflow/scenario-truth.

Each test_* function takes `impl` first; `impl(Input)` returns an Output. Runs are short, so
the budget in symbolon.toml is small.
"""

import math

from hypothesis import given, strategies as st

from schema import Input

BASE = {"duration": "20min", "dt": "10s"}
DURATION, DT = 1200.0, 10.0


def loop(chain=1):
    names = [f"ym{i}" for i in range(chain - 1)] + ["ym"]
    stages = [{"id": name, "op": "lag", "inputs": {"u": "y" if i == 0 else names[i - 1]}, "tau": "5s"} for i, name in enumerate(names)]
    return [
        {"id": "sp", "op": "schedule", "value": 80},
        {"id": "mode", "op": "schedule", "value": 1},
        {"id": "man", "op": "schedule", "value": 50},
        {"id": "u", "op": "pid", "inputs": {"pv": stages[-1]["id"], "sp": "sp", "mode": "mode", "man_out": "man"}, "Kc": 2, "Ti": "60s"},
        {"id": "yin", "op": "sum", "inputs": {"in0": "u", "in1": "d"}},
        {"id": "y", "op": "first_order", "inputs": {"u": "yin"}, "tau": "60s", "K": 0.5},
        *stages,
    ]


def plant(seed=0, std=1.0, chain=1, **more):
    return {
        **BASE, "seed": seed, "custom": loop(chain),
        "exogenous": [{"target": "d", "source": {"kind": "ou", "mean": 5, "std": std, "tau": "5min"}}],
        **more,
    }


def truth(impl, scenario):
    return impl(Input(scenario=scenario))


def by_name(out):
    return {s.signal: s for s in out.signals}


@given(st.integers(0, 10**6), st.floats(0.0, 20.0), st.sampled_from(["steady", "none"]))
def test_ground_truth_does_not_depend_on_the_seed_noise_or_initial_state(impl, seed, std, init):
    events = [{"at": "3min", "target": "sp", "value": 85}, {"at": "5min", "target": "y.K", "value": 0.4}]
    reference = truth(impl, plant(interventions=events))
    other = truth(impl, plant(seed=seed, std=std, init=init, interventions=events))
    assert other == reference


@given(st.lists(st.integers(0, 2400), min_size=1, max_size=6), st.integers(1, 3))
def test_events_are_logged_at_the_first_step_at_or_after_their_time(impl, times, lanes):
    interventions = [{"at": t, "target": "sp", "value": 70 + i, "id": f"e{i}"} for i, t in enumerate(times)]
    out = truth(impl, plant(lanes=lanes, noise_keys=[0] * lanes, interventions=interventions))
    expected = sorted(
        (math.ceil(t / DT) * DT, f"e{i}", lane) for i, t in enumerate(times) if math.ceil(t / DT) * DT < DURATION for lane in range(lanes)
    )
    assert [(e.applied_at, e.id, e.lane) for e in out.events] == expected
    assert all(e.at == times[int(e.id[1:])] for e in out.events)


@given(st.lists(st.tuples(st.sampled_from(["set", "shift", "scale"]), st.integers(-5, 5)), min_size=1, max_size=6), st.integers(60, 100))
def test_set_shift_and_scale_act_on_the_value_the_target_holds(impl, steps, initial):
    interventions = [{"at": 60 * (i + 1), "target": "sp", "value": v, "action": a, "id": f"e{i}"} for i, (a, v) in enumerate(steps)]
    scenario = plant(interventions=interventions)
    scenario["custom"][0]["value"] = initial
    out = truth(impl, scenario)
    held = float(initial)
    assert len(out.events) == len(steps)
    for event, (action, value) in zip(out.events, steps):
        after = {"set": float(value), "shift": held + value, "scale": held * value}[action]
        assert (event.value_before, event.value_after) == (held, after)
        assert event.action == action and event.value == value and event.label == "planned" and event.profile == "step" and event.over == 0
        held = after


@given(st.sets(st.sampled_from(["y.K", "y.tau", "u.Kc", "u.Ti", "u.Td"]), max_size=5))
def test_only_the_parameters_an_event_targets_are_signals(impl, targets):
    interventions = [{"at": "1min", "target": t, "value": 1.0 if t != "y.K" else 0.9, "action": "scale"} for t in sorted(targets)]
    out = truth(impl, plant(interventions=interventions))
    assert sorted(out.promoted) == sorted(targets)
    signals = by_name(out)
    assert set(signals) == {"d", "sp", "mode", "man", "u", "yin", "y", "ym", *targets}
    for path in targets:
        operator, _, parameter = path.partition(".")
        assert (out.promoted[path].operator, out.promoted[path].parameter) == (operator, parameter)
        assert [(r.role, r.loop) for r in signals[path].roles] == [("parameter", "")]
        assert signals[path].unit is None and signals[path].writer_op == "schedule" and signals[path].kind == "source"
        assert [(e.to, e.instantaneous) for e in out.causal_graph.edges if e.from_ == path] == [(operator, True)]
    assert set(out.causal_graph.nodes) == set(signals)


@given(st.integers(1, 4))
def test_the_regulated_variable_is_found_behind_the_whole_observation_chain(impl, chain):
    out = truth(impl, plant(chain=chain))
    signals = by_name(out)
    [the_loop] = out.loops
    last = "ym"
    assert (the_loop.name, the_loop.regulated, the_loop.measured, the_loop.reference, the_loop.mode, the_loop.manual, the_loop.output) == ("u", "y", last, "sp", "mode", "man", "u")
    assert the_loop.remote_reference is None and (the_loop.output_lo, the_loop.output_hi) == (0.0, 100.0)
    assert signals["y"].level == "true" and signals[last].level == "measured"
    stages = [n for n in signals if n.startswith("ym") and n != last]
    assert len(stages) == chain - 1 and all(signals[n].level == "internal" and signals[n].observed is False for n in stages)
    assert [(r.role, r.loop) for r in signals["y"].roles] == [("regulated", "u")]
    assert [(r.role, r.loop) for r in signals[last].roles] == [("measured", "u")]
    assert [(r.role, r.loop) for r in signals["d"].roles] == [("exogenous", "")]
    assert [(r.role, r.loop) for r in signals["yin"].roles] == [("free state", "")]
    assert {n for n, s in signals.items() if s.observed} == {"sp", "mode", "u", last}


@given(
    st.lists(st.integers(2, 8), min_size=1, max_size=3),
    st.lists(st.integers(0, 3), min_size=3, max_size=3),
    st.lists(st.sampled_from(["A", "B", "C"]), min_size=3, max_size=3),
)
def test_the_timeline_tiles_the_run_with_regimes_and_transitions(impl, gaps, overs, targets):
    regimes = {"A": {"sp": 80}, "B": {"sp": 90}, "C": {"sp": 70}}
    at, production, rows = 0.0, [], []
    previous, since = "A", 0.0
    for gap, over, target in zip(gaps, overs, targets):
        start = since + gap * 60.0
        production.append({"at": start, "to": target, "over": over * 60.0, "id": f"t{len(production)}"})
        if start > since:
            rows.append((since, start, "regime", previous))
        rows.append((start, start + over * 60.0, "transition", f"{previous}->{target}"))
        previous, since = target, start + over * 60.0
    rows.append((since, DURATION, "regime", previous))
    expected = sorted(((s, min(e, DURATION), k, n) for s, e, k, n in rows if s < DURATION), key=lambda r: (r[0], r[1]))
    out = truth(impl, plant(regimes=regimes, plan={"start": "A", "production": production}))
    assert sorted((r.start, r.end, r.kind, r.name) for r in out.timeline) == sorted(expected)
    assert [(r.start, r.end) for r in out.timeline] == sorted((r.start, r.end) for r in out.timeline)
    assert all(r.targets == "" for r in out.timeline)


@given(st.integers(1, 5), st.integers(0, 20))
def test_a_ramp_logs_the_value_it_ends_on_and_its_duration(impl, minutes, shift):
    event = {"at": "1min", "target": "sp", "value": shift, "action": "shift", "id": "r", "profile": "ramp", "over": f"{minutes}min"} if shift else {"at": "1min", "target": "sp", "value": 70, "id": "r", "profile": "ramp", "over": f"{minutes}min"}
    out = truth(impl, plant(interventions=[event]))
    [row] = out.events
    assert (row.profile, row.over) == ("ramp", minutes * 60.0)
    assert (row.value_before, row.value_after) == (80.0, 80.0 + shift if shift else 70.0)
