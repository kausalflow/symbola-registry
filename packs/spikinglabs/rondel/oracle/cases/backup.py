"""Cases for the backup component."""
import base64
import json

j = lambda v: json.dumps(v, separators=(",", ":"))
b = lambda raw: base64.b64encode(raw).decode()
NOW = "2026-10-17T12:00:00.000Z"
DATA = {"local": {"rondel:me": j({"id": "id-ana", "name": "Ana"}), "rondel:meetings": j([{"roomId": "r1", "key": "k1", "title": "Retro", "updatedAt": "2026-10-17T12:00:00.000Z"}])}, "docs": {"rondel-r1": "AAEC"}}


def case(note, op, raises=None, **kw):
    return {"input": {"op": op, **kw}, "note": note, **({"raises": raises} if raises else {})}


def merge(note, current, incoming, take=False):
    return case(note, "merge", current=current, incoming=incoming, take_identity=take)


def cases():
    out = []
    for v in ("0.26.0", "0.27.0"):
        out.append({"input": {"$fixture": f"read-{v}.json"}, "note": f"a protected backup saved by Rondel {v} restores"})
    out.append(case("an unprotected file", "read", file={"format": "rondel-backup", "version": 1, "exportedAt": NOW, "encrypted": False, "data": DATA}))
    out.append(case("a file given as text", "read", file=j({"format": "rondel-backup", "version": 1, "exportedAt": NOW, "encrypted": False, "data": DATA})))
    prot = {"op": "make", "now": NOW, "data": DATA, "passphrase": "correct horse", "salt": b(bytes(range(16))), "iv": b(bytes(range(12)))}
    out.append(case("make an unprotected backup", "make", now=NOW, data=DATA))
    out.append(case("make a protected backup: PBKDF2 310000 iterations, AES-GCM", **prot))
    f = {"format": "rondel-backup", "version": 1, "exportedAt": NOW, "encrypted": True, "kdf": {"name": "PBKDF2", "hash": "SHA-256", "iterations": 310000, "salt": b(bytes(range(16)))}, "iv": b(bytes(range(12)))}
    from_make = None  # filled in by the recorder run below
    out.append(case("a protected file needs the passphrase", "read", raises="ValueError", file={**f, "data": "AAAA"}))
    out.append(case("a wrong passphrase", "read", raises="ValueError", file={**f, "data": "AAAA"}, passphrase="nope"))
    out.append(case("not JSON", "read", raises="ValueError", file="{nope"))
    out.append(case("a meeting file is not a backup", "read", raises="ValueError", file={"format": "rondel-meeting", "version": 1}))
    out.append(case("a newer version", "read", raises="ValueError", file={"format": "rondel-backup", "version": 2, "encrypted": False, "data": DATA}))

    cur = {
        "rondel:me": j({"id": "new", "name": "Ana (laptop)"}),
        "rondel:meetings": j([{"roomId": "r1", "title": "Old title", "updatedAt": "2026-10-01"}, {"roomId": "r3", "title": "Only here", "updatedAt": "2026-10-02"}]),
        "rondel:prefs": j({"theme": "dark", "lastSeries": ["x"]}),
        "rondel:voter:r1": j("mine"),
    }
    inc = {
        "rondel:me": j({"id": "old", "name": "Ana"}),
        "rondel:meetings": j([{"roomId": "r1", "title": "New title", "updatedAt": "2026-10-05"}, {"roomId": "r2", "title": "Planning", "updatedAt": "2026-10-03"}]),
        "rondel:series": j([{"id": "s1", "key": "k", "name": "Weekly", "updatedAt": "2026-10-04"}]),
        "rondel:templates": j(["id: t1\nname: Mine"]),
        "rondel:prefs": j({"theme": "light", "lastSeries": ["y"], "lastTemplateId": "t1"}),
        "rondel:voter:r1": j("theirs"),
        "rondel:voter:r2": j("v2"),
        "other:key": j("ignored"),
    }
    out.append(merge("lists are merged, the browser's own settings and voter ids stay, the identity is kept", cur, inc))
    out.append(merge("take the identity: the id of the backup, the name this browser already has", cur, inc, True))
    out.append(merge("a fresh browser takes the identity and the backup's name", {}, inc))
    out.append(merge("the same person: nothing to write for them", {"rondel:me": inc["rondel:me"]}, {"rondel:me": j({"id": "old", "name": "Renamed"})}))
    out.append(merge("a tie keeps the browser's entry; a newer one wins; order: own first", {"rondel:meetings": j([{"roomId": "a", "updatedAt": "5", "t": "cur"}, {"roomId": "b", "t": "cur"}])}, {"rondel:meetings": j([{"roomId": "b", "updatedAt": "1", "t": "inc"}, {"roomId": "a", "updatedAt": "5", "t": "inc"}, {"roomId": "c", "t": "inc"}])}))
    out.append(merge("templates, people and own cards are unions without duplicates", {"rondel:templates": j(["a", "b"]), "rondel:people": j(["Zed", "Ben"]), "rondel:mine:r1": j(["c1"])}, {"rondel:templates": j(["b", "c"]), "rondel:people": j(["Ben", "Al"]), "rondel:mine:r1": j(["c1", "c2"]), "rondel:mine:r2": j(["x"])}))
    out.append(merge("drafts are merged by id, the browser's copy of a draft stays", {"rondel:drafts:r1": j([{"id": "d1", "text": "mine"}])}, {"rondel:drafts:r1": j([{"id": "d1", "text": "theirs"}, {"id": "d2", "text": "new"}, {"text": "no id"}])}))
    out.append(merge("nothing new: no changes and zero counts", {"rondel:meetings": j([{"roomId": "r1", "updatedAt": "2"}]), "rondel:templates": j(["a"]), "rondel:series": j([])}, {"rondel:meetings": j([{"roomId": "r1", "updatedAt": "1"}]), "rondel:templates": j(["a"]), "rondel:series": j([])}))
    out.append(merge("entries that are not JSON are skipped", {}, {"rondel:meetings": "{broken", "rondel:layout": j({"agendaOpen": False}), "rondel:lang": "en"}))
    out.append(merge("a layout this browser lacks is taken, one it has is kept", {"rondel:layout": j({"agendaOpen": True})}, {"rondel:layout": j({"agendaOpen": False}), "rondel:voter:r9": j("v")}))
    out.append(merge("preferences: the browser's fields win, the series names merge", {"rondel:prefs": j({"lastSeries": ["x", "y"]})}, {"rondel:prefs": j({"theme": "dark", "lastSeries": ["y", "z"]})}))
    out.append(merge("a template list without any in the browser", {}, {"rondel:templates": j(["a"])}))
    return out
