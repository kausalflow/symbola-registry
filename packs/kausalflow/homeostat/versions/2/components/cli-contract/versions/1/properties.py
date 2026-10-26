"""Behavioural properties for kausalflow/cli-contract.

Each test_* function takes `impl` first; `impl(Input)` returns an Output.
"""

import json

from hypothesis import given, strategies as st

from schema import Input

GOOD = {"duration": "10min", "dt": "10s", "custom": [{"id": "c", "op": "constant", "value": 5}, {"id": "s", "op": "schedule", "value": 1}]}
BAD = {**GOOD, "interventions": [{"at": "1min", "target": "nowhere", "value": 1}]}
WARNS = {**GOOD, "interventions": [{"at": "1h", "target": "s", "value": 1}]}
SCENARIOS = {"good": GOOD, "bad": BAD, "warns": WARNS}


def call(impl, argv, **files):
    return impl(Input(argv=argv, files={name: json.dumps(value) if not isinstance(value, str) else value for name, value in files.items()}))


@given(st.sampled_from(sorted(SCENARIOS)), st.booleans())
def test_validate_exits_zero_exactly_when_the_scenario_is_valid(impl, name, as_json):
    out = call(impl, ["validate", "s.json", *(["--json"] if as_json else [])], **{"s.json": SCENARIOS[name]})
    assert out.exit_code == (1 if name == "bad" else 0)
    assert out.stderr_has_issues is False
    assert out.codes == {"good": [], "bad": ["E_UNKNOWN_TARGET"], "warns": ["W_EVENT_AFTER_END"]}[name]
    if as_json:
        assert out.stdout_kind == "json" and out.ok == (name != "bad") and out.file == "s.json"
        assert (out.summary is None) == (name == "bad")
    else:
        assert out.headline == ("INVALID s.json: 1 problem" if name == "bad" else "OK s.json")


@given(st.sampled_from(["validate", "run", "explain", "diagnose"]), st.sampled_from(["bad", "missing"]))
def test_with_json_a_failure_is_one_json_object_on_standard_output(impl, command, which):
    files = {"s.json": BAD} if which == "bad" else {}
    out = call(impl, [command, "s.json", "--json"], **files)
    assert out.exit_code == 1 and out.stdout_kind == "json" and out.ok is False
    assert out.codes == (["E_UNKNOWN_TARGET"] if which == "bad" else ["E_FILE"])
    assert out.stderr_has_issues is False
    assert out.files_written == [] or all(f == "s.json" for f in out.files_written)


@given(st.sampled_from(["run", "explain", "diagnose", "convert"]), st.sampled_from(["bad", "missing"]))
def test_without_json_a_failure_is_issue_lines_on_standard_error(impl, command, which):
    files = {"s.json": BAD} if which == "bad" else {}
    argv = [command, "s.json"] + (["--to", "yaml"] if command == "convert" else [])
    out = call(impl, argv, **files)
    if command == "convert" and which == "bad":
        assert out.exit_code == 0  # convert only reads the file; it does not validate the scenario
        return
    assert out.exit_code == 1 and out.stdout_kind == "empty" and out.stderr_has_issues
    assert out.codes == (["E_UNKNOWN_TARGET"] if which == "bad" else ["E_FILE"])


@given(st.text(alphabet="abcdefghijklmnopqrstuvwxyz", min_size=3, max_size=10).filter(lambda w: w not in {"guide", "describe", "schema", "examples", "validate", "explain", "diagnose", "diff", "run", "eval", "skill", "convert"}))
def test_an_unknown_command_is_a_usage_error(impl, word):
    out = call(impl, [word])
    assert out.exit_code == 2 and out.stdout_kind == "empty"


@given(st.integers(-20, 20), st.integers(-20, 20))
def test_diagnose_exits_three_exactly_when_an_expectation_fails(impl, value, bound):
    scenario = {**GOOD, "custom": [{"id": "c", "op": "constant", "value": value}], "expect": [{"id": "e", "kind": "stat", "signal": "c", "stat": "mean", "at_least": bound}]}
    out = call(impl, ["diagnose", "s.json", "--json"], **{"s.json": scenario})
    holds = value >= bound
    assert out.exit_code == (0 if holds else 3)
    assert out.ok is holds
    assert [(c.id, c.status) for c in out.checks] == [("e", "pass" if holds else "fail")]


@given(st.integers(1, 3), st.booleans())
def test_run_out_writes_one_file_per_view_and_lane(impl, lanes, as_json):
    scenario = {**GOOD, "lanes": lanes}
    out = call(impl, ["run", "s.json", "--out", "res", *(["--json"] if as_json else [])], **{"s.json": scenario})
    assert out.exit_code == 0
    suffixes = [""] if lanes == 1 else [f".lane{k}" for k in range(lanes)]
    expected = sorted([f"res/{view}{suffix}.csv" for view in ("truth", "measured", "observed") for suffix in suffixes] + ["res/meta.json"])
    assert out.files_written == expected
    if as_json:
        assert "files" in out.json_keys and out.ok is True


@given(st.sampled_from(sorted(GOOD)))
def test_convert_to_json_keeps_the_scenario_mapping(impl, _key):
    out = call(impl, ["convert", "s.json", "--to", "json"], **{"s.json": GOOD})
    assert out.exit_code == 0 and out.stdout_kind == "json" and out.json_keys == sorted(GOOD)


@given(st.sampled_from(["good", "warns"]))
def test_standard_input_is_named_stdin(impl, name):
    out = impl(Input(argv=["validate", "-", "--json"], stdin=json.dumps(SCENARIOS[name])))
    assert out.exit_code == 0 and out.file == "<stdin>"
