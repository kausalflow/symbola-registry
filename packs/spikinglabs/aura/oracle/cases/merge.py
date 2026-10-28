"""Cases for the merge component."""

COLL = ["children", "episodes", "entries", "meds", "measurements", "growth", "products", "vaccines", "checkups", "dental", "appts", "emergency", "docs", "pages"]


def it(i, u=None, **kw):
    return {"id": i, **({"updatedAt": u} if u is not None else {}), **kw}


def log(v=3, app="aura", **colls):
    return {"app": app, "v": v, **colls}


def case(note, op, raises=None, **kw):
    return {"input": {"op": op, **kw}, "note": note, **({"raises": raises} if raises else {})}


def merge(note, local, incoming, raises=None):
    return case(note, "merge", raises, local=local, incoming=incoming)


def cases():
    out = []
    out.append(merge("new items on both sides are kept; local first, then the new ones", {"entries": [it("a", 5, t=1), it("b", 5, t=2)]}, log(entries=[it("c", 1, t=3), it("a", 5, t=9)])))
    out.append(merge("a newer incoming item replaces local's and keeps its place", {"entries": [it("a", 5, note="mine"), it("b", 5)]}, log(entries=[it("a", 6, note="theirs")])))
    out.append(merge("a tie keeps the local item", {"entries": [it("a", 5, note="mine")]}, log(entries=[it("a", 5, note="theirs")])))
    out.append(merge("an older incoming item loses", {"entries": [it("a", 9, note="mine")]}, log(entries=[it("a", 2, note="theirs")])))
    out.append(merge("a newer deletion wins and stays as a tombstone", {"entries": [it("a", 5, note="x")]}, log(entries=[{"id": "a", "deleted": True, "updatedAt": 8}])))
    out.append(merge("an edit after a deletion brings the item back", {"entries": [{"id": "a", "deleted": True, "updatedAt": 8}]}, log(entries=[it("a", 9, note="back")])))
    out.append(merge("an older deletion does not remove a later edit", {"entries": [it("a", 9, note="kept")]}, log(entries=[{"id": "a", "deleted": True, "updatedAt": 3}])))
    out.append(merge("a missing updatedAt counts as 0", {"meds": [it("m1", None, name="Ibuprofen")]}, log(meds=[it("m1", 1, name="Ibuprofen", gapH=6), it("m2")])))
    out.append(merge("all collections merge; a missing one in incoming is left alone", {"children": [it("c1", 1, name="Mia")], "docs": [it("d1", 1)]}, log(pages=[it("p1", 1, docId="d1")], children=[it("c2", 1, name="Jonas")])))
    out.append(merge("local example data is replaced, not mixed", {"example": True, "children": [it("ex", 1, name="Example")], "child": "ex"}, log(children=[it("c1", 1, name="Mia")])))
    out.append(merge("the selected child stays", {"child": "c2", "children": [it("c1", 1), it("c2", 1)]}, log()))
    out.append(merge("without a selected child, the first child that is not deleted is chosen", {"children": [{"id": "c0", "deleted": True, "updatedAt": 2}, it("c1", 1)]}, log(children=[it("c3", 1)])))
    out.append(merge("a log from the sick-day-log app is accepted", {"entries": []}, log(v=1, app="sick-day-log", children=[it("c1", 1, name="Mia")], episodes=[{"id": "ep1", "childId": "c1", "start": 5}], entries=[{"id": "e1", "ep": "ep1", "type": "temp", "t": 6, "tempC": 38.5}])))
    out.append(merge("a version 2 log is upgraded first: book photos become pages", {}, log(v=2, children=[it("c1", 1)], vaccines=[{"id": "v1", "childId": "c1", "kind": "page", "t": 5, "img": "data:image/jpeg;base64,AA", "updatedAt": 7}])))
    out.append(merge("not an Aura log", {}, {"app": "other", "entries": []}, raises="ValueError"))
    out.append(merge("a log without app", {}, {"entries": []}, raises="ValueError"))
    out.append(merge("a log from a newer version of Aura", {}, log(v=4, entries=[]), raises="ValueError"))
    a = {"id": "a", "updatedAt": 5}
    out.append(case("covered: everything of mine is there and as new", "covered", mine={"entries": [a], "meds": []}, theirs={"entries": [{"id": "a", "updatedAt": 5}, {"id": "b", "updatedAt": 1}]}))
    out.append(case("covered: theirs has an older copy of one of mine", "covered", mine={"entries": [a]}, theirs={"entries": [{"id": "a", "updatedAt": 4}]}))
    out.append(case("covered: one of mine is missing", "covered", mine={"entries": [a], "pages": [{"id": "p", "updatedAt": 1}]}, theirs={"entries": [a]}))
    out.append(case("covered: a missing updatedAt counts as 0; empty collections cover", "covered", mine={"entries": [{"id": "x"}]}, theirs={"entries": [{"id": "x"}], "pages": []}))
    out.append(case("unknown parts of a newer app's log", "unknown", log={"app": "aura", "v": 3, "savedAt": 1, "entries": [], "settings": {}, "child": None, "photos2": [1, 2], "labels": {"a": 1}}))
    out.append(case("no unknown parts", "unknown", log={"app": "aura", "v": 3, "savedAt": 1, **{k: [] for k in COLL}, "example": False, "drive": {}, "recalls": {}, "docTr": {}}))
    out.append(case("is-aura: a log", "is-aura", log={"app": "aura", "entries": []}))
    out.append(case("is-aura: the old app's log", "is-aura", log={"app": "sick-day-log", "entries": []}))
    out.append(case("is-aura: entries must be a list", "is-aura", log={"app": "aura", "entries": {}}))
    out.append(case("is-aura: some other JSON", "is-aura", log={"hello": 1}))
    out.append(case("is-aura: not an object", "is-aura", log=None))
    return out
