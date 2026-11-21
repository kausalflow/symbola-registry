"""Behavioural properties for emptymalei/scan-batch."""

from hypothesis import given, strategies as st

from schema import Input

NO_TOKEN = "No active profile set for group 'admin'. Use 'pbi auth -g admin' to create a profile or 'pbi profile switch -g admin' to switch profiles."
FLAGS = ["lineage", "datasource_details", "dataset_schema", "dataset_expressions", "get_artifact_users"]
BOOLEANS = {"true": True, "false": False, "yes": True, "no": False, "on": True, "off": False, "True": True}
NOT_BOOLEANS = ["1", "0", "'true'", "null", "abc", "[]"]
NUMBERS = {"5": 5.0, "2.5": 2.5, "'3'": 3.0, "10": 10.0, "0": 0.0, "-1": -1.0, "null": None, "true": 1.0, "''": "bad", "abc": "bad", "[1]": "bad", "'x'": "bad"}
IDS = st.text(alphabet="abcdef01-", min_size=1, max_size=6).map("ws-{}".format)
NAMES = st.none() | st.text(alphabet="ABC xyz", min_size=1, max_size=6).filter(lambda s: s.strip() and s == s.strip())


def run(impl, config, files=None):
    return impl(Input(argv=["workspaces", "scan", "batch", "-c", "scan.yaml"], files={"scan.yaml": config, **(files or {})}))


def entry_yaml(i, name):
    return f"  - id: {i}\n" + (f"    name: {name}\n" if name else "")


@given(st.lists(st.tuples(IDS, NAMES), min_size=1, max_size=4, unique_by=lambda t: t[0]))
def test_workspaces_that_cannot_start_are_reported_in_order_and_the_run_fails(impl, entries):
    config = "workspace_ids:\n" + "".join(entry_yaml(i, n) for i, n in entries) + "target_folder: out\n"
    out = run(impl, config)
    labels = [f"{n} ({i})" if n else i for i, n in entries]
    expected = ["creating folder <scratch>/out"]
    for label in labels:
        expected += ["", f"=== Workspace {label} ===", f"✗ {label}: {NO_TOKEN}"]
    expected += ["", "Failed workspaces: " + ", ".join(labels)]
    assert out.exit_code == 1 and out.errors == [] and out.files == {}
    assert out.stdout == "\n".join(expected)


settings = st.fixed_dictionaries(
    {},
    optional={
        **{flag: st.sampled_from(sorted(BOOLEANS) + NOT_BOOLEANS) for flag in FLAGS},
        "interval": st.sampled_from(sorted(NUMBERS)),
        "timeout": st.sampled_from(sorted(NUMBERS)),
    },
)


@given(settings)
def test_settings_are_checked_flags_first_then_numbers(impl, values):
    config = "workspace_ids: [ws-a]\ntarget_folder: out\n" + "".join(f"{k}: {v}\n" for k, v in values.items())
    out = run(impl, config)
    bad_flag = next((f for f in FLAGS if f in values and values[f] not in BOOLEANS), None)
    numbers = [NUMBERS[values[k]] for k in ("interval", "timeout") if k in values]
    if bad_flag:
        error = f"Error: '{bad_flag}' must be a boolean value."
    elif "bad" in numbers:
        error = "Error: 'interval' and 'timeout' must be numeric values."
    elif any(n is not None and n <= 0 for n in numbers):
        error = "Error: 'interval' and 'timeout' must be greater than 0."
    else:
        error = None
    assert out.exit_code == 1
    assert out.stdout.splitlines()[0] == "creating folder <scratch>/out"
    if error:
        assert out.errors == [error] and out.stdout == "creating folder <scratch>/out"
    else:
        assert out.errors == [] and out.stdout.splitlines()[-1] == "Failed workspaces: ws-a"


PROBLEMS = {
    "not_mapping": ("- a\n", "Config file scan.yaml must contain a YAML mapping."),
    "no_entries": ("target_folder: out\n", "Config file scan.yaml must list at least one workspace ID under 'workspace_ids'."),
    "empty_entries": ("workspace_ids: []\ntarget_folder: out\n", "Config file scan.yaml must list at least one workspace ID under 'workspace_ids'."),
    "not_a_list": ("workspace_ids: ws-a\ntarget_folder: out\n", "'workspace_ids' must be a YAML list."),
    "no_id": ("workspace_ids:\n  - name: x\ntarget_folder: out\n", "Workspace entry missing 'id'"),
    "bad_entry": ("workspace_ids: [3]\ntarget_folder: out\n", "Invalid workspace entry"),
    "no_target": ("workspace_ids: [ws-a]\n", "Config file scan.yaml must set 'target_folder'."),
    "empty_target": ("workspace_ids: [ws-a]\ntarget_folder: ''\n", "Config file scan.yaml must set 'target_folder'."),
}


@given(st.sampled_from(sorted(PROBLEMS)), st.sampled_from(["", "lineage: 3\n", "timeout: 0\n"]))
def test_config_problems_come_before_any_setting_is_looked_at(impl, problem, extra):
    config, message = PROBLEMS[problem]
    out = run(impl, config + ("" if problem == "not_mapping" else extra))
    assert out.exit_code == 1 and out.errors == [f"Error: {message}"] and out.stdout == "" and out.files == {}
