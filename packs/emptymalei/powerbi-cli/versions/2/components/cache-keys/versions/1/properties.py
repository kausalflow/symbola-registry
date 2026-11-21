"""Behavioural properties for emptymalei/cache-keys."""

import re

from datetime import datetime

from hypothesis import given, strategies as st

from schema import Input

KEY = st.text(alphabet="abcdefghij_0123456789", min_size=1, max_size=12)
TOKENS = st.text(alphabet="abcdefghijklmnopqrstuvwxyz0123456789", min_size=1, max_size=6)


@given(st.integers(0, 5000), st.lists(st.sampled_from(["users", "reports", "datasets"]), max_size=3), st.none() | st.text(alphabet="abc eq'", max_size=10))
def test_workspaces_key_and_metadata(impl, top, expand, odata_filter):
    out = impl(Input(op="key", command="workspaces list", top=top, expand=expand, odata_filter=odata_filter))
    assert out.cache_key == "workspaces"
    assert out.metadata == {"top": top, "expand": expand, "filter": odata_filter}


@given(st.sampled_from(["admin", "user"]))
def test_apps_key_has_the_role(impl, role):
    out = impl(Input(op="key", command="apps list", role=role))
    assert (out.cache_key, out.metadata) == (f"apps_{role}", {"role": role})


@given(st.lists(TOKENS, min_size=1, max_size=4))
def test_user_key_keeps_an_id_that_is_already_a_slug(impl, parts):
    user_id = "-".join(parts)
    out = impl(Input(op="key", command="users user-access", user_id=user_id))
    assert out.cache_key == f"user_access_{user_id}" and out.metadata == {"user_id": user_id}


@given(st.lists(TOKENS, min_size=1, max_size=4), st.sampled_from([" ", "@", ".", "_", " / ", "--"]))
def test_user_key_slugs_other_ids(impl, parts, separator):
    out = impl(Input(op="key", command="users user-access", user_id=separator.join(p.upper() for p in parts)))
    assert out.cache_key == "user_access_" + "-".join(parts)


@given(KEY, st.datetimes(min_value=datetime(2000, 1, 1), max_value=datetime(2099, 12, 31)), st.none() | st.dictionaries(st.sampled_from(["top", "role"]), st.integers(0, 9), max_size=2), st.dictionaries(st.sampled_from(["value", "x"]), st.integers(0, 9), max_size=2))
def test_entry_is_one_versioned_file(impl, key, now, metadata, data):
    out = impl(Input(op="entry", cache_key=key, data=data, metadata=metadata, now=now.isoformat()))
    version = now.strftime("%Y%m%d_%H%M%S")
    assert re.fullmatch(r"\d{8}_\d{6}", out.version) and out.version == version
    assert out.paths == [f"{key}/{version}/{key}.json"]
    assert list(out.document.items()) == [("cache_key", key), ("cached_at", now.isoformat()), ("version", version), ("metadata", metadata or {}), ("data", data)]


NAMES = st.sampled_from(["a", "b", "c"])
VERSIONS = st.sampled_from(["1", "2", "10", "20240101_120000", "20240102_090000", "z"])


@st.composite
def folders(draw):
    files = set()
    for _ in range(draw(st.integers(0, 12))):
        key, version = draw(NAMES), draw(VERSIONS)
        files.add(f"{key}/{version}/{draw(st.sampled_from([key, key, 'other']))}.json")
    for _ in range(draw(st.integers(0, 2))):
        files.add(draw(st.sampled_from(["stray.json", "a.json", "b/loose.json"])))
    return sorted(files)


@given(folders())
def test_index_lists_versions_newest_first(impl, files):
    out = impl(Input(op="index", files=files))
    versions: dict[str, list[str]] = {}
    for path in files:
        parts = path.split("/")
        if len(parts) >= 2:
            versions.setdefault(parts[0], [])
        if len(parts) == 3 and parts[2] == f"{parts[0]}.json":
            versions[parts[0]].append(parts[1])
    versions = {k: sorted(v, reverse=True) for k, v in versions.items()}
    assert {k: v for k, v in out.versions.items()} == versions
    assert out.keys == sorted(k for k, v in versions.items() if v)
    assert out.latest == {k: (v[0] if v else None) for k, v in versions.items()}
