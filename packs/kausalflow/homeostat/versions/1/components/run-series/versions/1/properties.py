"""Behavioural properties for kausalflow/run-series.

Each test_* function takes `impl` first; `impl(Input)` returns an Output. Statistical checks
use tolerances of five standard errors or more, so they hold for every seed.
"""

import math

import numpy as np
from hypothesis import given, strategies as st

from schema import Input


def series(impl, scenario, signals):
    out = impl(Input(scenario=scenario, signals=signals))
    return np.array(out.seconds), {s: np.array(v, dtype=float) for s, v in out.values.items()}


def close(a, b):
    return np.allclose(a, b, rtol=1e-8, atol=1e-9)


@given(
    st.floats(0.2, 3.0), st.floats(5, 300), st.floats(-50, 50), st.floats(-50, 50),
    st.sampled_from([1, 2, 5, 10]), st.sampled_from([20, 50, 100]), st.sampled_from(["first_order", "lag"]),
)
def test_first_order_responses_follow_the_exact_exponential_whatever_dt(impl, gain, tau, u0, u1, dt, t0, op):
    params = {"K": gain} if op == "first_order" else {}
    scenario = {
        "duration": 400, "dt": dt,
        "custom": [{"id": "u", "op": "schedule", "value": u0}, {"id": "y", "op": op, "inputs": {"u": "u"}, "tau": tau, **params}],
        "interventions": [{"at": t0, "target": "u", "value": u1}],
    }
    seconds, values = series(impl, scenario, ["y"])
    k = gain if op == "first_order" else 1.0
    y0, yinf = k * u0, k * u1
    expected = np.where(seconds <= t0, y0, yinf + (y0 - yinf) * np.exp(-(seconds - t0) / tau))
    assert close(values["y"][0], expected)


@given(st.floats(-20, 20), st.floats(-20, 20), st.floats(0, 120), st.floats(1, 150), st.sampled_from([1, 2, 5]))
def test_a_ramp_is_linear_from_the_step_that_applies_it(impl, v0, v1, at, over, dt):
    scenario = {
        "duration": 300, "dt": dt, "custom": [{"id": "u", "op": "schedule", "value": v0}],
        "interventions": [{"at": at, "target": "u", "value": v1, "profile": "ramp", "over": over}],
    }
    seconds, values = series(impl, scenario, ["u"])
    applied = math.ceil(at / dt - 1e-9) * dt
    expected = v0 + (v1 - v0) * np.clip((seconds - applied) / over, 0.0, 1.0)
    assert close(values["u"][0], expected)


@given(
    st.lists(st.tuples(st.sampled_from(["set", "shift", "scale"]), st.integers(-3, 3)), min_size=1, max_size=5),
    st.sampled_from([1, 5]),
)
def test_events_set_shift_and_scale_the_held_value(impl, steps, dt):
    interventions = [{"at": 20 * (i + 1), "target": "u", "value": v, "action": a} for i, (a, v) in enumerate(steps)]
    seconds, values = series(impl, {"duration": 200, "dt": dt, "custom": [{"id": "u", "op": "schedule", "value": 7}], "interventions": interventions}, ["u"])
    held, expected = 7.0, []
    for t in seconds:
        for i, (a, v) in enumerate(steps):
            if t == 20 * (i + 1):
                held = {"set": float(v), "shift": held + v, "scale": held * v}[a]
        expected.append(held)
    assert close(values["u"][0], expected)


@given(st.lists(st.integers(-2, 2), min_size=1, max_size=5), st.floats(0.1, 2.0), st.floats(-5, 5), st.sampled_from([1, 5]))
def test_an_integrator_adds_k_dt_u_and_stays_within_its_limits(impl, inputs, k, initial, dt):
    lo, hi = -6.0, 6.0
    scenario = {
        "duration": 120, "dt": dt,
        "custom": [{"id": "u", "op": "schedule", "value": 0}, {"id": "x", "op": "integrator", "inputs": {"u": "u"}, "k": k, "initial": initial, "lo": lo, "hi": hi}],
        "interventions": [{"at": 20 * (i + 1), "target": "u", "value": v} for i, v in enumerate(inputs)],
    }
    seconds, values = series(impl, scenario, ["x"])
    x, held, expected = min(max(initial, lo), hi), 0.0, []
    for t in seconds:
        for i, v in enumerate(inputs):
            if t == 20 * (i + 1):
                held = float(v)
        expected.append(x)
        x = min(max(x + k * dt * held, lo), hi)
    assert close(values["x"][0], expected)


@given(st.floats(0.5, 5), st.integers(0, 1000), st.integers(0, 3))
def test_sampled_rows_are_a_thinning_of_the_full_run(impl, gain, seed, ratio):
    every = 10 * (ratio + 1)
    scenario = {"duration": 600, "dt": 10, "seed": seed, "custom": [{"id": "d", "op": "ou", "std": gain, "tau": 40}, {"id": "y", "op": "first_order", "inputs": {"u": "d"}, "tau": 60}]}
    seconds, full = series(impl, scenario, ["y"])
    thin_seconds, thin = series(impl, {**scenario, "output": {"every": every}}, ["y"])
    step = every // 10
    assert close(thin_seconds, seconds[::step]) and close(thin["y"][0], full["y"][0][::step])


NOISY = {"duration": 300, "dt": 5, "custom": [
    {"id": "d", "op": "ou", "mean": 2, "std": 1.5, "tau": 40},
    {"id": "y", "op": "first_order", "inputs": {"u": "d"}, "tau": 30},
]}


@given(st.integers(0, 10**6), st.integers(0, 10**6))
def test_the_same_seed_repeats_and_another_seed_gives_other_noise(impl, seed, other):
    a = series(impl, {**NOISY, "seed": seed}, ["d", "y"])[1]
    b = series(impl, {**NOISY, "seed": seed}, ["d", "y"])[1]
    assert all(np.array_equal(a[s], b[s]) for s in a)
    if other != seed:
        c = series(impl, {**NOISY, "seed": other}, ["d"])[1]
        assert not np.array_equal(a["d"], c["d"])


@given(st.integers(0, 10**6), st.sampled_from(["ou", "ar"]), st.booleans())
def test_unrelated_operators_and_events_do_not_move_an_operators_noise(impl, seed, extra_kind, with_event):
    extra = {"id": "zz_other", "op": extra_kind, "std": 1.0, **({"tau": 10} if extra_kind == "ou" else {"coef": [0.5]})}
    plain = {**NOISY, "seed": seed}
    changed = {**plain, "custom": [extra, {"id": "gate", "op": "schedule", "value": 1}, *plain["custom"]]}
    if with_event:
        changed["interventions"] = [{"at": 100, "target": "gate", "value": 3}]
    base = series(impl, plain, ["d", "y"])[1]
    other = series(impl, changed, ["d", "y"])[1]
    assert close(base["d"], other["d"]) and close(base["y"], other["y"])


@given(st.integers(0, 10**6), st.integers(0, 50), st.booleans())
def test_lanes_with_the_same_noise_key_share_noise_and_the_key_alone_decides(impl, seed, key, event_on_one_lane):
    custom = [*NOISY["custom"], {"id": "u", "op": "schedule", "value": 0}, {"id": "s", "op": "sum", "inputs": {"in0": "d", "in1": "u"}}]
    scenario = {**NOISY, "seed": seed, "lanes": 2, "noise_keys": [key, key], "custom": custom}
    if event_on_one_lane:
        scenario["interventions"] = [{"at": 100, "target": "u", "value": 5, "lanes": [1]}]
    _, twin = series(impl, scenario, ["d", "y", "s"])
    assert np.array_equal(twin["d"][0], twin["d"][1]) and np.array_equal(twin["y"][0], twin["y"][1])
    assert (twin["s"][0] == twin["s"][1]).all() == (not event_on_one_lane)
    apart = series(impl, {**scenario, "noise_keys": [key, key + 1]}, ["d"])[1]["d"]
    assert not np.array_equal(apart[0], apart[1])
    alone = series(impl, {**NOISY, "seed": seed, "noise_keys": [key + 1], "custom": custom}, ["d"])[1]["d"]
    assert np.array_equal(alone[0], apart[1])


@given(st.integers(0, 10**6), st.floats(-10, 10), st.floats(0.2, 5), st.floats(5, 20), st.sampled_from([1, 2, 5]))
def test_ou_has_the_stated_stationary_mean_std_and_autocorrelation_at_any_dt(impl, seed, mean, std, tau, dt):
    scenario = {"duration": 40000, "dt": dt, "seed": seed, "custom": [{"id": "d", "op": "ou", "mean": mean, "std": std, "tau": tau}]}
    x = series(impl, scenario, ["d"])[1]["d"][0]
    assert abs(x.mean() - mean) < 0.3 * std
    assert abs(x.std() / std - 1) < 0.2
    centred = x - x.mean()
    rho = float((centred[1:] * centred[:-1]).mean() / centred.var())
    assert abs(rho - math.exp(-dt / tau)) < 0.08


@given(st.integers(0, 10**6), st.floats(0.1, 0.9), st.floats(0.2, 5), st.floats(-10, 10))
def test_ar1_has_the_stated_mean_std_and_autocorrelation(impl, seed, phi, std, mean):
    x = series(impl, {"duration": 30000, "dt": 1, "seed": seed, "custom": [{"id": "a", "op": "ar", "coef": [phi], "mean": mean, "std": std}]}, ["a"])[1]["a"][0]
    assert abs(x.mean() - mean) < 0.3 * std
    assert abs(x.std() / std - 1) < 0.2
    centred = x - x.mean()
    assert abs(float((centred[1:] * centred[:-1]).mean() / centred.var()) - phi) < 0.08


@given(st.integers(0, 10**6))
def test_two_operators_with_the_same_parameters_have_unrelated_noise(impl, seed):
    ops = [{"id": name, "op": "ou", "std": 1.0, "tau": 10} for name in ("a", "b")]
    x = series(impl, {"duration": 20000, "dt": 5, "seed": seed, "custom": ops}, ["a", "b"])[1]
    assert not np.array_equal(x["a"], x["b"])
    assert abs(float(np.corrcoef(x["a"][0], x["b"][0])[0, 1])) < 0.3
