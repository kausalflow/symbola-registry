"""Behavioural properties for emptymalei/config-cache."""

import json

from hypothesis import given, strategies as st

from schema import Input

CONFIG = ".pbi_cli/config.yaml"
SEGMENT = st.text(alphabet="abcxyz019_ ", min_size=1, max_size=6).filter(lambda s: s.strip() == s)


def run(impl, argv, files=None, stdin=None):
    return impl(Input(argv=argv, files=files or {}, stdin=stdin))


@st.composite
def folders(draw):
    parts = "/".join(draw(st.lists(SEGMENT, min_size=1, max_size=3)))
    kind = draw(st.sampled_from(["relative", "home", "absolute"]))
    plain = {"relative": parts, "home": "~/" + parts, "absolute": "/" + parts}[kind]
    expected = {"relative": "<scratch>/" + parts, "home": "<scratch>/" + parts, "absolute": "/" + parts}[kind]
    quote = draw(st.sampled_from(["", '"', "'"]))
    slash = draw(st.sampled_from(["", "/"]))
    return quote + plain + slash + quote, expected


EXTRA_KEYS = st.dictionaries(st.sampled_from(["theme", "language", "retries"]), st.integers(0, 9), max_size=2)


def extra_text(extra):
    return "".join(f"{k}: {v}\n" for k, v in extra.items())


@given(folders(), st.sampled_from(["output", "cache"]), EXTRA_KEYS)
def test_set_folder_stores_one_absolute_path_and_keeps_the_other_keys(impl, folder, which, extra):
    given_path, expected = folder
    out = run(impl, ["config", f"set-{which}-folder", given_path], {CONFIG: "cache_enabled: false\n" + extra_text(extra)})
    key = "default_output_folder" if which == "output" else "cache_folder"
    assert out.exit_code == 0
    assert out.files[CONFIG] == {"cache_enabled": False, **extra, key: expected}
    assert out.stdout.splitlines() == (
        [f"✓ Default output folder set to: {expected}", "  Commands will now use subfolders within this folder by default."]
        if which == "output"
        else [f"✓ Cache folder set to: {expected}", "  API call results will be cached in this folder."]
    )


@given(st.sampled_from(["s3", "gs", "az"]), st.lists(SEGMENT, min_size=1, max_size=3), st.sampled_from(["", '"', "'"]))
def test_set_cache_folder_keeps_cloud_locations(impl, scheme, parts, quote):
    location = f"{scheme}://" + "/".join(parts)
    out = run(impl, ["config", "set-cache-folder", quote + location + quote])
    assert out.files[CONFIG]["cache_folder"] == location
    assert out.stdout.splitlines()[0] == f"✓ Cache folder set to: {location}"


@given(st.sampled_from(["enable", "disable"]), EXTRA_KEYS, st.none() | st.booleans())
def test_enable_and_disable_change_only_cache_enabled(impl, command, extra, before):
    files = {CONFIG: extra_text(extra) + ("" if before is None else f"cache_enabled: {str(before).lower()}\n") + "cache_folder: cache\n"}
    out = run(impl, ["config", f"{command}-cache"], files)
    before_keys = {**extra, **({} if before is None else {"cache_enabled": before}), "cache_folder": "cache"}
    assert out.files.get(CONFIG, before_keys) == {**extra, "cache_folder": "cache", "cache_enabled": command == "enable"}
    assert out.stdout == ("✓ Cache enabled" if command == "enable" else "✓ Cache disabled")


@given(st.none() | st.just("/data/out"), st.none() | st.just("cache"), st.booleans(), st.lists(st.sampled_from(["a", "b", "c"]), unique=True, max_size=3), st.sampled_from(["a", "b", "c", None]), st.lists(st.sampled_from(["a", "b"]), unique=True, max_size=2), st.sampled_from(["a", "b", None]), st.lists(st.sampled_from(["a", "b"]), unique=True, max_size=2), st.sampled_from(["a", "b", None]))
def test_show_lists_the_settings(impl, output, cache, enabled, flat, flat_active, user, user_active, admin, admin_active):
    lines_cfg = [f"active_profile: {flat_active or 'null'}"]
    lines_cfg += ["profiles: {}"] if not flat else ["profiles:"] + [f"  {n}:\n    name: {n}" for n in flat]
    lines_cfg += ["groups:"]
    for name, (names, active) in {"user": (user, user_active), "admin": (admin, admin_active)}.items():
        lines_cfg += [f"  {name}:", f"    active_profile: {active or 'null'}"] + (["    profiles: {}"] if not names else ["    profiles:"] + [f"      {n}:\n        name: {n}" for n in names])
    lines_cfg += [f"default_output_folder: {output or 'null'}", f"cache_folder: {cache or 'null'}", f"cache_enabled: {str(enabled).lower()}"]
    out = run(impl, ["config", "show"], {CONFIG: "\n".join(lines_cfg) + "\n"})
    expected = [
        "Current configuration:",
        f"  Active profile: {flat_active or 'None'}",
        f"  Default output folder: {output or 'Not set'}",
        f"  Cache folder: {cache or 'Not set'}",
        f"  Cache enabled: {enabled}",
        f"  Profiles: {len(flat)}",
    ]
    if flat:
        expected += ["", "  Available profiles (ungrouped):"] + [f"    - {n}{' (active)' if n == flat_active else ''}" for n in flat]
    expected += ["", "  Groups:", f"    user: {len(user)} profile(s), active='{user_active or 'None'}'", f"    admin: {len(admin)} profile(s), active='{admin_active or 'None'}'"]
    assert out.stdout.splitlines() == expected


VERSIONS = st.sampled_from(["20240101_120000", "20240102_150000", "20231231_235959", "v1", "v10"])


@st.composite
def cache_trees(draw):
    files = {}
    for _ in range(draw(st.integers(0, 8))):
        key, version = draw(st.sampled_from(["workspaces", "apps_user", "apps_admin"])), draw(VERSIONS)
        name = draw(st.sampled_from([key, key, "notes"]))
        files[f"cache/{key}/{version}/{name}.{'json' if name == key else 'txt'}"] = json.dumps({"cache_key": key, "data": {}})
    return files


def listing(files):
    keys = {}
    for path in files:
        _, key, version, name = path.split("/")
        keys.setdefault(key, [])
        if name == f"{key}.json":
            keys[key].append(version)
    return {k: sorted(v, reverse=True) for k, v in sorted(keys.items()) if v}


@given(cache_trees(), st.none() | st.sampled_from(["workspaces", "apps_user", "apps_admin", "other"]))
def test_list_counts_versions_per_key_or_lists_the_versions_of_one_key(impl, files, key):
    out = run(impl, ["cache", "list"] + (["-k", key] if key else []), {CONFIG: "cache_folder: cache\ncache_enabled: false\n", **files})
    keys = listing(files)
    assert out.exit_code == 0 and out.files == {}
    if key is None:
        expected = ["Cached data:"] + [f"  - {k} ({len(v)} version(s))" for k, v in keys.items()] if keys else ["No cached data found."]
    else:
        expected = [f"Cached versions for '{key}':"] + [f"  - {v}" for v in keys[key]] if keys.get(key) else [f"No cached versions found for '{key}'"]
    assert out.stdout.splitlines() == expected


@given(st.none() | st.sampled_from(["workspaces", "apps_user"]), st.none() | VERSIONS, cache_trees(), st.booleans())
def test_clear_reports_what_it_cleared(impl, key, version, files, configured):
    argv = ["cache", "clear", "--yes"] + (["-k", key] if key else []) + (["-v", version] if version else [])
    out = run(impl, argv, {**({CONFIG: "cache_folder: cache\n"} if configured else {}), **files})
    assert out.exit_code == 0
    if not configured:
        assert out.stdout.splitlines() == ["Cache folder not configured.", "Use 'pbi config set-cache-folder' to set one."]
    elif version and not key:
        assert out.stdout == "Error: --version requires --cache-key"
    elif key and version:
        assert out.stdout == f"✓ Cleared {key} version {version}"
    elif key:
        assert out.stdout == f"✓ Cleared all versions of {key}"
    else:
        assert out.stdout == "✓ Cleared entire cache"
    assert out.files == {}
