"""Behavioural properties for emptymalei/file-converters."""

import json

from hypothesis import given, strategies as st

from schema import Input

TOKEN = {".pbi_cli/config.yaml": "groups:\n  user:\n    active_profile: u\n    profiles:\n      u:\n        name: u\n", ".pbi_cli/credentials.json": '{"u": "t"}'}
COMMANDS = [["apps", "augment"], ["reports", "users"]]
NO_APPS = st.sampled_from(['{"value": []}', "{}", '{"other": 1}', '{"@odata.context": "x", "value": []}'])
STEM = st.text(alphabet="abc_1", min_size=1, max_size=5)


@given(st.sampled_from(COMMANDS), NO_APPS, STEM)
def test_json_target_of_no_apps_is_an_empty_list(impl, command, source, stem):
    out = impl(Input(argv=[*command, "-s", "a.json", "-t", f"{stem}.json"], files={**TOKEN, "a.json": source}))
    assert out.ok and out.files == {f"{stem}.json": []}


@given(st.sampled_from(COMMANDS), NO_APPS, STEM, st.sampled_from(["", ".xlsx", ".d", ".json"]))
def test_excel_target_is_a_folder_without_extension(impl, command, source, stem, suffix):
    out = impl(Input(argv=[*command, "-s", "a.json", "-t", stem + suffix, "-ft", "excel"], files={**TOKEN, "a.json": source}))
    assert out.ok == (suffix == "") and out.files == {}


@given(st.sampled_from(COMMANDS), NO_APPS, st.sampled_from(["json", "excel"]))
def test_without_a_token_nothing_is_written(impl, command, source, file_type):
    out = impl(Input(argv=[*command, "-s", "a.json", "-t", "outdir" if file_type == "excel" else "o.json", "-ft", file_type], files={"a.json": source}))
    assert not out.ok and out.files == {}


@given(st.sampled_from(COMMANDS), st.sampled_from(["[]", '"x"', "null", "7"]))
def test_a_source_that_is_not_an_object_fails(impl, command, source):
    out = impl(Input(argv=[*command, "-s", "a.json", "-t", "o.json"], files={**TOKEN, "a.json": source}))
    assert not out.ok and out.files == {}


workspace = st.fixed_dictionaries(
    {"id": st.text(alphabet="wxyz01", min_size=1, max_size=3)},
    optional={"name": st.text(alphabet="abc ", max_size=5), "users": st.lists(st.fixed_dictionaries({"id": st.integers(0, 3)}), max_size=2), "reports": st.lists(st.fixed_dictionaries({"id": st.integers(0, 3)}), max_size=2)},
)


@given(st.lists(workspace, min_size=1, max_size=3), STEM)
def test_format_convert_writes_a_workbook_under_the_given_name(impl, workspaces, stem):
    out = impl(Input(argv=["workspaces", "format-convert", "-s", "ws.json", "-t", f"{stem}.xlsx"], files={"ws.json": json.dumps({"value": workspaces})}))
    assert out.ok and out.files == {f"{stem}.xlsx": "<xlsx>"}


@given(st.sampled_from(["not json", "", "{"]))
def test_format_convert_fails_on_unreadable_source(impl, text):
    out = impl(Input(argv=["workspaces", "format-convert", "-s", "ws.json", "-t", "o.xlsx"], files={"ws.json": text}))
    assert not out.ok and out.files == {}
