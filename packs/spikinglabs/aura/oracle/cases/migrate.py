"""Cases for the migrate component."""

V1 = {"app": "sick-day-log", "v": 1, "children": [{"id": "c1", "name": "Mia", "dob": "2025-01-05"}, {"id": "c2", "name": "Jonas", "deleted": True}],
      "episodes": [{"id": "ep1", "childId": "c1", "start": 1000, "end": None}],
      "entries": [{"id": "e1", "ep": "ep1", "type": "temp", "t": 1100, "tempC": 38.5}, {"id": "e2", "ep": "ep1", "child": "c2", "type": "note", "t": 1200}],
      "measurements": [{"id": "m9", "childId": "c1", "t": 5, "weightKg": 9}],
      "settings": {"unit": "F", "me": "Anna"}, "extra": "dropped"}
PAGE = lambda i, type_, **kw: {"id": i, "childId": "c1", "kind": "page", "t": 50, "img": "data:image/jpeg;base64,AA", **kw}
V2 = {"app": "aura", "v": 2, "children": [{"id": "c1", "name": "Mia", "updatedAt": 1}], "entries": [], "docs": [], "pages": [],
      "vaccines": [PAGE("p1", "vax", updatedAt=10, order=2, note="front"), {"id": "d1", "childId": "c1", "kind": "dose", "t": 60, "against": ["mmr"], "updatedAt": 3}, PAGE("p2", "vax", deleted=True, updatedAt=12)],
      "checkups": [PAGE("p3", "u"), {"id": "x1", "childId": "c1", "kind": "exam", "u": "U4", "t": 70, "updatedAt": 4}], "future": 1}


def case(note, log):
    return {"input": {"log": log}, "note": note}


def cases():
    return [
        case("a sick-day log (version 1) becomes a current log", V1),
        case("version 1 without medicines or settings", {"app": "sick-day-log", "children": [{"id": "c1", "name": "Mia"}]}),
        case("a version 2 log: book photos become pages of documents", V2),
        case("version 2 where documents and pages already exist", {**V2, "docs": [{"id": "vax-c1", "childId": "c1", "type": "vax", "title": "Mine", "note": "", "updatedAt": 9}], "pages": [{"id": "p1", "docId": "vax-c1", "childId": "c1", "t": 50, "img": "x", "note": "", "updatedAt": 10}]}),
        case("version 2 without documents, pages or photo items", {"app": "aura", "v": 2, "children": [], "entries": [], "vaccines": [], "checkups": []}),
        case("a current log is returned as it is", {"app": "aura", "v": 3, "children": [{"id": "c1", "updatedAt": 1}], "docs": [], "unknown": [1]}),
        case("a log without v counts as version 1", {"app": "aura", "children": [{"id": "c1"}], "entries": []}),
        case("v that is not a positive integer counts as version 1", {"app": "aura", "v": 0, "children": [], "entries": []}),
        case("a log from a newer version is left alone", {"app": "aura", "v": 4, "children": [], "novel": {"a": 1}}),
        case("null is returned as it is", None),
        case("a log without v keeps every collection the v1 step does not convert", {"app": "aura", "children": [{"id": "c1", "name": "Mia"}], "entries": [], "vaccines": [{"id": "v1", "childId": "c1", "kind": "dose", "against": ["mmr"], "t": 1}], "docs": [{"id": "d1", "childId": "c1", "type": "other", "title": "Kita contract"}], "appts": [{"id": "a1", "childId": "c1", "plan": "u", "k": "U5", "date": "2026-11-20"}]}),
    ]
