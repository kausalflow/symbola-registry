"""Behavioral properties for lightkone/library-merge.

Libraries are generated as a base plus independent edits on each side, the
way two devices diverge: fields changed or removed, tags and folders added or
taken away, papers added or deleted.
"""

import copy
import json

from hypothesis import given, strategies as st

from schema import Input, Library

IDS = ["a", "b", "c", "d", "e"]
TAGS = ["ml", "physics", "to read", "qft"]
FOLDERS = ["ML", "Physics", "Physics/QFT"]


def same(x, y) -> bool:
    return json.dumps(x, sort_keys=True) == json.dumps(y, sort_keys=True)


@st.composite
def paper(draw, pid):
    p = {"id": pid, "title": draw(st.sampled_from(["Attention", "Dropout", "Gauge fields", "Untitled"])),
         "tags": draw(st.lists(st.sampled_from(TAGS), unique=True, max_size=3))}
    if draw(st.booleans()):
        p["year"] = draw(st.integers(2000, 2024))
    if draw(st.booleans()):
        p["folders"] = draw(st.lists(st.sampled_from(FOLDERS), unique=True, max_size=2))
    if draw(st.booleans()):
        p["notes"] = draw(st.sampled_from(["read twice", "check eq. 3"]))
    return p


@st.composite
def library(draw):
    ids = draw(st.lists(st.sampled_from(IDS), unique=True, max_size=4))
    return {"papers": [draw(paper(i)) for i in ids]}


@st.composite
def edited(draw, lib, fields=("title", "year", "notes", "starred")):
    """A copy of lib after a few edits on one device."""
    out = copy.deepcopy(lib)
    for _ in range(draw(st.integers(0, 3))):
        op = draw(st.sampled_from(["field", "drop-field", "tag", "untag", "add", "remove"]))
        papers = out["papers"]
        if op == "add":
            free = [i for i in IDS if i not in {p["id"] for p in papers}]
            if free:
                papers.append(draw(paper(draw(st.sampled_from(free)))))
            continue
        if not papers:
            continue
        p = draw(st.sampled_from(papers))
        if op == "remove":
            papers.remove(p)
        elif op == "field":
            k = draw(st.sampled_from(fields))
            p[k] = {"title": "Edited title", "year": 1999, "notes": "new note", "starred": True}[k]
        elif op == "drop-field":
            p.pop(draw(st.sampled_from(["year", "notes", "starred"])), None)
        elif op == "tag":
            t = draw(st.sampled_from(TAGS))
            if t not in p["tags"]:
                p["tags"].append(t)
        elif op == "untag" and p["tags"]:
            p["tags"].remove(draw(st.sampled_from(p["tags"])))
    return out


def merge(impl, base, ours, theirs):
    out = impl(Input(base=None if base is None else Library(**base), ours=Library(**ours), theirs=Library(**theirs)))
    return out.file.papers, out.fromThem


def by_id(lib):
    return {p["id"]: p for p in lib["papers"]}


@given(lib=library())
def test_nothing_changed_merges_to_itself(impl, lib):
    assert merge(impl, lib, lib, lib) == (lib["papers"], 0)


@given(data=st.data(), base=library())
def test_changes_made_only_elsewhere_are_taken_whole(impl, data, base):
    theirs = data.draw(edited(base))
    papers, from_them = merge(impl, base, base, theirs)
    assert papers == theirs["papers"]
    ours, mine = by_id(base), by_id(theirs)
    assert from_them == sum(not same(mine.get(i), ours.get(i)) for i in dict.fromkeys([*mine, *ours]))


@given(data=st.data(), base=library())
def test_changes_made_only_here_are_kept(impl, data, base):
    ours = data.draw(edited(base))
    papers, from_them = merge(impl, base, ours, base)
    assert from_them == 0
    kept = by_id(ours)
    order = [i for i in by_id(base) if i in kept] + [i for i in kept if i not in by_id(base)]
    assert [p["id"] for p in papers] == order and all(same(p, kept[p["id"]]) for p in papers)


@given(base=library(), data=st.data())
def test_edits_to_different_fields_both_survive(impl, base, data):
    if not base["papers"]:
        return
    target = data.draw(st.sampled_from(base["papers"]))["id"]
    ours, theirs = copy.deepcopy(base), copy.deepcopy(base)
    by_id(ours)[target]["title"] = "Ours"
    by_id(theirs)[target]["notes"] = "Theirs"
    got = by_id({"papers": merge(impl, base, ours, theirs)[0]})[target]
    assert got["title"] == "Ours" and got["notes"] == "Theirs"


@given(base=library(), data=st.data())
def test_the_same_field_changed_both_ways_keeps_ours(impl, base, data):
    if not base["papers"]:
        return
    target = data.draw(st.sampled_from(base["papers"]))["id"]
    ours, theirs = copy.deepcopy(base), copy.deepcopy(base)
    by_id(ours)[target]["title"], by_id(theirs)[target]["title"] = "Ours", "Theirs"
    by_id(theirs)[target]["year"] = 1900  # a second change there, so neither side equals the base
    got = by_id({"papers": merge(impl, base, ours, theirs)[0]})[target]
    assert got["title"] == "Ours" and got["year"] == 1900


@given(base=library(), data=st.data(), add_o=st.sampled_from(TAGS), add_t=st.sampled_from(TAGS))
def test_tags_merge_as_sets(impl, base, data, add_o, add_t):
    if not base["papers"]:
        return
    target = data.draw(st.sampled_from(base["papers"]))["id"]
    ours, theirs = copy.deepcopy(base), copy.deepcopy(base)
    o, t, b = by_id(ours)[target], by_id(theirs)[target], by_id(base)[target]
    removed = data.draw(st.sampled_from(b["tags"])) if b["tags"] else None
    if removed:
        o["tags"].remove(removed)
    o["tags"] = list(dict.fromkeys(o["tags"] + [add_o]))
    t["tags"] = list(dict.fromkeys(t["tags"] + [add_t]))
    t["title"] = "Theirs too"
    got = by_id({"papers": merge(impl, base, ours, theirs)[0]})[target]["tags"]
    gone = {x for x in b["tags"] if x not in o["tags"] or x not in t["tags"]}
    assert got == [x for x in dict.fromkeys(o["tags"] + t["tags"]) if x not in gone]


@given(base=library(), data=st.data())
def test_a_paper_deleted_here_but_changed_there_survives(impl, base, data):
    if not base["papers"]:
        return
    target = data.draw(st.sampled_from(base["papers"]))["id"]
    ours, theirs = copy.deepcopy(base), copy.deepcopy(base)
    ours["papers"] = [p for p in ours["papers"] if p["id"] != target]
    by_id(theirs)[target]["notes"] = "edited elsewhere"
    assert target in by_id({"papers": merge(impl, base, ours, theirs)[0]})


@given(ours=library(), theirs=library())
def test_without_a_base_every_paper_is_kept_and_ours_wins(impl, ours, theirs):
    papers, _ = merge(impl, None, ours, theirs)
    expected = {**by_id(theirs), **by_id(ours)}
    assert by_id({"papers": papers}) == expected
