"""Behavioural properties for emptymalei/workspace-entries."""

import re

from hypothesis import given, strategies as st

from schema import Input

IDS = st.text(alphabet="abcdef0123456789-", min_size=1, max_size=12)
WORDS = st.text(alphabet="abcdefXYZ0189", min_size=1, max_size=6)
SEPARATORS = st.sampled_from([" ", "  ", "_", " / ", "-", " & ", ".", "'", "--"])


def assert_invalid(impl, value):
    try:
        out = impl(Input(workspace_ids=value))
    except ValueError:
        return
    raise AssertionError(f"expected ValueError, got {out}")


@st.composite
def names(draw):
    words = draw(st.lists(WORDS, min_size=1, max_size=4))
    out = draw(SEPARATORS).lstrip() if draw(st.booleans()) else ""
    for word in words:
        out += word + draw(SEPARATORS)
    return out, "-".join(w.lower() for w in words)


@given(st.lists(st.one_of(IDS, st.builds(lambda i: {"id": i}, IDS)), max_size=5))
def test_entries_without_a_name_use_the_id(impl, ids):
    out = impl(Input(workspace_ids=ids)).entries
    plain = [i if isinstance(i, str) else i["id"] for i in ids]
    assert [(e.id, e.name, e.label, e.file_stem) for e in out] == [(i, None, i, i) for i in plain]


@given(IDS, names())
def test_a_name_is_slugged_into_the_file_name(impl, workspace_id, named):
    name, slug = named
    (entry,) = impl(Input(workspace_ids=[{"id": workspace_id, "name": name}])).entries
    assert entry.name == name
    assert entry.label == f"{name} ({workspace_id})"
    assert entry.file_stem == f"{slug}-{workspace_id}"


@given(st.lists(st.tuples(IDS, st.none() | WORDS), min_size=1, max_size=5))
def test_order_is_kept_and_extra_keys_are_ignored(impl, pairs):
    raw = [{"id": i, "name": n, "owner": "x"} if n else {"id": i, "owner": "x"} for i, n in pairs]
    out = impl(Input(workspace_ids=raw)).entries
    assert [e.id for e in out] == [i for i, _ in pairs]
    assert all(re.fullmatch(r"[a-z0-9]+-" + re.escape(e.id), e.file_stem) for e, (_, n) in zip(out, pairs) if n)
    assert all(e.file_stem == e.id for e, (_, n) in zip(out, pairs) if not n)


@given(st.one_of(st.none(), st.integers(), st.text(max_size=5), st.dictionaries(st.text(max_size=3), st.integers(), max_size=2), st.booleans()))
def test_workspace_ids_must_be_a_list(impl, value):
    assert_invalid(impl, value)


@given(st.lists(st.sampled_from([5, True, None, [], ["a"], {}, {"name": "x"}, {"id": ""}, {"id": None, "name": "x"}]), min_size=1, max_size=3), st.lists(IDS, max_size=2))
def test_one_bad_entry_makes_the_input_invalid(impl, bad, good):
    assert_invalid(impl, [*good, *bad])
