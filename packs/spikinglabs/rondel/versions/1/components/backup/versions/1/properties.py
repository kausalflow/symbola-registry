"""Behavioural properties for spikinglabs/backup."""

import base64
import json

from hypothesis import given, settings, strategies as st

from schema import Input

NOW = "2026-10-17T12:00:00.000Z"
j = lambda v: json.dumps(v, separators=(",", ":"), ensure_ascii=False)
WORDS = st.text(alphabet=st.sampled_from(list("abcdefghij éü€😀-_ ")), min_size=1, max_size=12)


def call(impl, **kw):
    return impl(Input(**kw)).result


@st.composite
def backup_data(draw):
    meetings = [{"roomId": f"room{i}", "key": draw(WORDS), "title": draw(WORDS), "updatedAt": f"2026-10-{draw(st.integers(10, 28))}"} for i in range(draw(st.integers(0, 3)))]
    local = {"rondel:me": j({"id": draw(WORDS), "name": draw(WORDS)}), "rondel:meetings": j(meetings)}
    docs = {f"rondel-room{i}": base64.b64encode(draw(st.binary(max_size=30))).decode() for i in range(len(meetings))}
    return {"local": local, "docs": docs}


def test_what_was_saved_comes_back_only_with_the_passphrase(impl):
    @given(backup_data(), st.one_of(st.none(), WORDS))
    def check(data, passphrase):
        file = call(impl, op="make", now=NOW, data=data, passphrase=passphrase)
        assert list(file)[:4] == ["format", "version", "exportedAt", "encrypted"]
        assert file["format"] == "rondel-backup" and file["version"] == 1 and file["exportedAt"] == NOW
        assert file["encrypted"] == (passphrase is not None)
        text = json.dumps(file)
        if passphrase is None:
            assert call(impl, op="read", file=text) == data
            return
        assert file["kdf"]["iterations"] == 310000 and len(base64.b64decode(file["kdf"]["salt"])) == 16 and len(base64.b64decode(file["iv"])) == 12
        assert "rondel:me" not in text and "roomId" not in text and "rondel-room" not in text, "nothing readable in a protected file"
        assert call(impl, op="read", file=file, passphrase=passphrase) == data
        for wrong in (None, passphrase + "x"):
            try:
                call(impl, op="read", file=file, passphrase=wrong)
            except ValueError:
                pass
            else:
                raise AssertionError("opened without the passphrase")

    check()


def test_two_protected_files_of_the_same_data_differ(impl):
    @settings(deadline=None)
    @given(backup_data())
    def check(data):
        a = call(impl, op="make", now=NOW, data=data, passphrase="pw")
        b = call(impl, op="make", now=NOW, data=data, passphrase="pw")
        assert a["kdf"]["salt"] != b["kdf"]["salt"] and a["iv"] != b["iv"] and a["data"] != b["data"]

    check()


KEYS = st.sampled_from(["rondel:me", "rondel:meetings", "rondel:series", "rondel:templates", "rondel:people", "rondel:mine:r1", "rondel:drafts:r1", "rondel:prefs", "rondel:voter:r1", "rondel:layout", "other:x"])


def entry(key):
    ident = st.sampled_from(["a", "b", "c"])
    stamp = st.sampled_from(["", "1", "2", "3"])
    if key == "rondel:me":
        return st.builds(lambda i, n: j({"id": i, "name": n}), ident, st.sampled_from(["", "Ana", "Ben"]))
    if key in ("rondel:meetings", "rondel:series"):
        field = "roomId" if key.endswith("meetings") else "id"
        return st.lists(st.builds(lambda i, u, t: {field: i, "updatedAt": u, "title": t}, ident, stamp, st.sampled_from(["x", "y"])), max_size=3).map(j)
    if key in ("rondel:templates", "rondel:people") or key.startswith("rondel:mine:"):
        return st.lists(st.sampled_from(["p", "q", "r"]), max_size=3).map(j)
    if key.startswith("rondel:drafts:"):
        return st.lists(st.builds(lambda i, t: {"id": i, "text": t}, ident, st.sampled_from(["x", "y"])), max_size=3).map(j)
    if key == "rondel:prefs":
        return st.builds(lambda t, s: j({"theme": t, "lastSeries": s}), st.sampled_from(["dark", "light"]), st.lists(st.sampled_from(["s", "t", "u"]), max_size=3))
    return st.sampled_from(["1", '"v"', '{"a":1}'])


@st.composite
def storage(draw):
    return {k: draw(entry(k)) for k in draw(st.lists(KEYS, unique=True, max_size=7))}


def test_merging_loses_nothing_and_a_second_merge_changes_nothing(impl):
    @given(storage(), storage(), st.booleans())
    def check(current, incoming, take):
        first = call(impl, op="merge", current=current, incoming=incoming, take_identity=take)
        assert all(k.startswith("rondel:") for k in first["changes"])
        after = dict(current) | {k: j(v) for k, v in first["changes"].items()}
        for key, field in (("rondel:meetings", "roomId"), ("rondel:series", "id")):
            if key in current:
                had = {x[field] for x in json.loads(current[key])}
                assert had <= {x[field] for x in json.loads(after[key])}, "nothing is removed"
        again = call(impl, op="merge", current=after, incoming=incoming, take_identity=take)
        assert again["changes"] == {}, "restoring twice changes nothing more"
        assert again["identity"] in ("kept", "same")

    check()
