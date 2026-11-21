"""Behavioural properties for spikinglabs/migrate."""

from hypothesis import given, strategies as st

from schema import Input

IDS = st.sampled_from(list("abcdef"))
KIDS = st.sampled_from(["c1", "c2"])


def run(impl, log):
    return impl(Input(log=log))


@st.composite
def photo_items(draw, prefix):
    out = []
    for i in range(draw(st.integers(0, 4))):
        kind = draw(st.sampled_from(["page", "page", "dose", "exam"]))
        x = {"id": f"{prefix}{i}", "childId": draw(KIDS), "kind": kind, "t": draw(st.integers(0, 99)), "img": "data:image/jpeg;base64,AA", "updatedAt": draw(st.integers(0, 50))}
        if draw(st.booleans()):
            x["deleted"] = True
        if draw(st.booleans()):
            x["note"] = "n"
        if draw(st.booleans()):
            x["order"] = draw(st.integers(0, 5))
        out.append(x)
    return out


@st.composite
def v2_logs(draw):
    return {"app": "aura", "v": 2, "children": [{"id": "c1"}, {"id": "c2"}], "vaccines": draw(photo_items("v")), "checkups": draw(photo_items("u")), "entries": [{"id": "e", "child": "c1"}]}


def test_a_current_log_is_not_touched(impl):
    @given(st.fixed_dictionaries({"app": st.just("aura"), "v": st.just(3), "children": st.lists(st.fixed_dictionaries({"id": IDS}), max_size=3), "novel": st.integers(-1000, 1000)}))
    def check(log):
        r = run(impl, log)
        assert r.log == log and r.too_new is False and r.schema_version == 3

    check()


def test_a_newer_log_is_left_alone_and_reported(impl):
    @given(st.integers(4, 99), st.integers(-1000, 1000))
    def check(v, n):
        log = {"app": "aura", "v": v, "children": [], "x": n}
        r = run(impl, log)
        assert r.too_new is True and r.log == log

    check()


def test_every_photo_becomes_one_page_and_a_tombstone(impl):
    @given(v2_logs())
    def check(log):
        out = run(impl, log).log
        assert out["v"] == 3
        pages = {p["id"]: p for p in out["pages"]}
        for src, list_name, typ in ((log["vaccines"], "vaccines", "vax"), (log["checkups"], "checkups", "u")):
            for x, y in zip(src, out[list_name]):
                if x["kind"] != "page":
                    assert y == x, "other items stay"
                    continue
                assert y == {"id": x["id"], "childId": x["childId"], "kind": "page", "deleted": True, "updatedAt": x["updatedAt"] + 1}
                doc = next(d for d in out["docs"] if d["id"] == f"{typ}-{x['childId']}")
                assert doc["type"] == typ and doc["childId"] == x["childId"]
                if x.get("deleted"):
                    assert x["id"] not in pages
                else:
                    p = pages[x["id"]]
                    assert p["docId"] == doc["id"] and p["img"] == x["img"] and p["t"] == x["t"] and p["note"] == x.get("note", "") and p["updatedAt"] == x["updatedAt"]
                    assert ("order" in p) == ("order" in x)
        assert len(out["pages"]) == len(pages)

    check()


def test_upgrading_twice_gives_the_same_log(impl):
    @given(v2_logs())
    def check(log):
        once = run(impl, log).log
        assert run(impl, once).log == once

    check()


def test_old_entries_get_their_child_from_the_illness(impl):
    @given(st.lists(st.tuples(IDS, st.one_of(st.none(), KIDS)), max_size=6, unique_by=lambda x: x[0]))
    def check(rows):
        log = {"app": "sick-day-log", "children": [{"id": "c1"}, {"id": "c2"}], "episodes": [{"id": "ep1", "childId": "c1"}, {"id": "ep2", "childId": "c2"}],
               "entries": [{"id": i, "ep": "ep2" if k else "ep1", **({"child": k} if k else {})} for i, k in rows]}
        out = run(impl, log).log
        for (i, k), e in zip(rows, out["entries"]):
            assert e["child"] == (k or "c1") if not k else e["child"] == k
            assert e["id"] == i
        assert out["child"] == "c1" and out["v"] == 3

    check()
