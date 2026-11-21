"""Behavioural properties for emptymalei/cached-reads."""

import json
import re

from hypothesis import given, strategies as st

from schema import Input

CONFIG = ".pbi_cli/config.yaml"
WORKSPACE_COLUMNS = ["id", "name", "type", "state", "isReadOnly", "isOnDedicatedCapacity"]
APP_COLUMNS = ["id", "name", "description", "publishedBy", "lastUpdate"]
VERSION_DIRS = ["20240101_120000", "20240102_090000", "20231231_235959", "v1", "v10", "z"]
NO_PROFILE = "Error: No active profile set for group '{g}'. Use 'pbi auth -g {g}' to create a profile or 'pbi profile switch -g {g}' to switch profiles."


def document(key, directory, data):
    return json.dumps({"cache_key": key, "cached_at": f"at-{directory}", "version": f"doc-{directory}", "metadata": {}, "data": data})


def run(impl, argv, files, stdin=None):
    return impl(Input(argv=argv, files={CONFIG: "cache_folder: cache\n", **files}, stdin=stdin))


def records(columns, extras=("capacityId", "users")):
    cell = st.text(alphabet="abc12", min_size=1, max_size=5)
    return st.lists(
        st.fixed_dictionaries({"id": st.text(alphabet="wxyz0123456789", min_size=1, max_size=4)}, optional={**{c: cell for c in columns[1:]}, **{c: cell for c in extras}}),
        max_size=4,
    )


def shown_columns(rows, columns):
    present = [c for c in columns if any(c in r for r in rows)]
    return present


@given(records(WORKSPACE_COLUMNS), st.lists(st.sampled_from(VERSION_DIRS), unique=True, min_size=1, max_size=4))
def test_cache_only_shows_the_latest_version_of_the_key(impl, rows, versions):
    latest = max(versions)
    files = {}
    for v in versions:
        files[f"cache/workspaces/{v}/workspaces.json"] = document("workspaces", v, {"value": rows if v == latest else [{"id": "old"}]})
    out = run(impl, ["workspaces", "list", "--cache-only"], files)
    assert out.exit_code == 0 and out.errors == [] and out.files == {}
    assert out.lines[0] == f"Using cached data from at-{latest} (version: doc-{latest})"
    if not rows:
        assert out.table is None and out.lines[1:] == ["No workspaces found."]
    else:
        assert out.lines[1:] == [] and out.table.title == f"Workspaces: {len(rows)} record(s)"
        assert out.table.columns == shown_columns(rows, WORKSPACE_COLUMNS)
        assert out.table.rows == [r["id"] for r in rows]


@given(st.sampled_from(["user", "admin"]), records(APP_COLUMNS), records(APP_COLUMNS), st.booleans())
def test_apps_read_the_key_of_their_role(impl, role, mine, other, explicit):
    files = {
        f"cache/apps_{role}/v1/apps_{role}.json": document(f"apps_{role}", "v1", {"value": mine}),
        f"cache/apps_{'admin' if role == 'user' else 'user'}/v1/x.json": document("x", "v1", {"value": other}),
    }
    out = run(impl, ["apps", "list", "--cache-only"] + (["--role", role] if explicit or role == "admin" else []), files)
    assert out.exit_code == 0
    if not mine:
        assert out.lines[1:] == [f"No apps ({role}) found."]
    else:
        assert out.table.title == f"Apps ({role}): {len(mine)} record(s)"
        assert out.table.columns == shown_columns(mine, APP_COLUMNS) and out.table.rows == [r["id"] for r in mine]


@given(st.lists(st.text(alphabet="abcXYZ019", min_size=1, max_size=5), min_size=1, max_size=3), st.sampled_from([" ", ".", "@", "_", "-", " / "]))
def test_user_access_is_cached_under_the_slug_of_the_id(impl, parts, separator):
    user_id = separator.join(parts)
    slug = re.sub(r"[^a-z0-9]+", "-", user_id.lower()).strip("-")
    files = {f"cache/user_access_{slug}/v1/user_access_{slug}.json": document(f"user_access_{slug}", "v1", {"artifacts": []})}
    out = run(impl, ["users", "user-access", "-u", user_id, "--cache-only"], files)
    assert out.exit_code == 0 and out.errors == []
    assert out.table.title == f"User Access Information for: {user_id}" and out.table.columns == ["artifacts"]


SETUPS = {
    "no_folder": ({CONFIG: "cache_enabled: true\n"}, "configured"),
    "disabled": ({CONFIG: "cache_folder: cache\ncache_enabled: false\n", "cache/workspaces/v1/workspaces.json": document("workspaces", "v1", {"value": []})}, "configured"),
    "empty": ({CONFIG: "cache_folder: cache\n"}, "available"),
    "other_key": ({CONFIG: "cache_folder: cache\n", "cache/apps_user/v1/apps_user.json": document("apps_user", "v1", {"value": []})}, "available"),
    "unreadable_latest": ({CONFIG: "cache_folder: cache\n", "cache/workspaces/v1/workspaces.json": document("workspaces", "v1", {"value": []}), "cache/workspaces/v2/workspaces.json": "[1,"}, "available"),
}


@given(st.sampled_from(sorted(SETUPS)))
def test_cache_only_without_a_usable_cache_fails_with_exit_1(impl, setup):
    files, kind = SETUPS[setup]
    out = impl(Input(argv=["workspaces", "list", "--cache-only"], files=files))
    assert out.exit_code == 1 and out.errors == ["Aborted!"] and out.table is None and out.files == {}
    assert out.lines == (["Error: Cache not available and --cache-only was specified"] if kind == "available" else ["Error: Cache not configured and --cache-only was specified", "Use 'pbi config set-cache-folder' to configure caching."])


@given(st.sampled_from([["workspaces", "list"], ["apps", "list"], ["apps", "list", "--role", "admin"], ["users", "user-access", "-u", "x"]]), st.booleans())
def test_use_cache_that_misses_goes_on_to_the_api_and_needs_a_token(impl, command, configured):
    out = impl(Input(argv=[*command, "--use-cache"], files={CONFIG: "cache_folder: cache\n"} if configured else {}))
    group = "user" if command == ["apps", "list"] else "admin"
    assert out.exit_code == 1 and out.errors == [NO_PROFILE.format(g=group)]
    announced = [f"Listing Apps as {'admin' if 'admin' in command else 'user'}"] if command[0] == "apps" else []
    assert out.lines == (["Cache not available, fetching from API..."] if configured else []) + announced


NAME = st.text(alphabet="abc_1", min_size=1, max_size=5)


@given(records(WORKSPACE_COLUMNS), NAME, NAME, st.sampled_from([None, "out"]))
def test_target_folder_gets_the_cached_data_as_one_line_json(impl, rows, folder, name, base):
    data = {"value": rows}
    config = "cache_folder: cache\n" + (f"default_output_folder: {base}\n" if base else "")
    out = run(impl, ["workspaces", "list", "--cache-only", "-tf", folder, "-n", name], {CONFIG: config, "cache/workspaces/v1/workspaces.json": document("workspaces", "v1", data)})
    where = f"{base}/{folder}" if base else folder
    assert out.exit_code == 0 and out.table is None
    assert out.files == {f"{where}/{name}.json": data}
    assert out.lines == ["Using cached data from at-v1 (version: doc-v1)", f"creating folder {where if base else '<scratch>/' + folder}"]
