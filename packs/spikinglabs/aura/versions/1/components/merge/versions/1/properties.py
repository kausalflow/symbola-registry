"""Behavioural properties for spikinglabs/merge."""

from hypothesis import given, strategies as st

from schema import Input

COLL = ["children", "episodes", "entries", "meds", "measurements", "growth", "products", "vaccines", "checkups", "dental", "appts", "emergency", "docs", "pages"]
IDS = st.sampled_from(list("abcdefgh"))


@st.composite
def items(draw, tag):
    ids = draw(st.lists(IDS, unique=True, max_size=6))
    return [
        {"id": i, "from": tag, **({"updatedAt": draw(st.integers(0, 6))} if draw(st.booleans()) else {}), **({"deleted": True} if draw(st.integers(0, 3)) == 0 else {})}
        for i in ids
    ]


@st.composite
def logs(draw):
    local = {k: draw(items("local")) for k in draw(st.lists(st.sampled_from(COLL), unique=True, max_size=4))}
    incoming = {k: draw(items("incoming")) for k in draw(st.lists(st.sampled_from(COLL), unique=True, max_size=4))}
    return local, {"app": "aura", "v": 3, **incoming}


def merge(impl, local, incoming):
    return impl(Input(op="merge", local=local, incoming=incoming)).result


def ts(x):
    return x.get("updatedAt", 0)


def test_the_newer_item_wins_and_a_tie_keeps_local(impl):
    @given(logs())
    def check(pair):
        local, incoming = pair
        res = merge(impl, local, incoming)
        for k in COLL:
            mine, theirs = {x["id"]: x for x in local.get(k, [])}, {x["id"]: x for x in incoming.get(k, [])}
            got = {x["id"]: x for x in res[k]}
            want_ids = set(mine) | set(theirs)
            if k == "meds" and not want_ids:
                continue  # an empty log holds the starting medicines only when it is rebuilt
            assert set(got) == want_ids and len(res[k]) == len(want_ids), "nothing is lost, nothing doubled"
            for i in want_ids:
                if i in mine and i in theirs:
                    want = theirs[i] if ts(theirs[i]) > ts(mine[i]) else mine[i]
                else:
                    want = mine.get(i) or theirs[i]
                assert got[i] == want, (k, i)

    check()


def test_order_is_local_first_then_new_items_of_incoming(impl):
    @given(logs())
    def check(pair):
        local, incoming = pair
        res = merge(impl, local, incoming)
        for k in COLL:
            lids = [x["id"] for x in local.get(k, [])]
            new = [x["id"] for x in incoming.get(k, []) if x["id"] not in lids]
            if lids or new:
                assert [x["id"] for x in res[k]] == lids + new

    check()


def test_merging_again_changes_nothing(impl):
    @given(logs())
    def check(pair):
        local, incoming = pair
        once = merge(impl, local, incoming)
        again = merge(impl, {k: once[k] for k in COLL}, incoming)
        assert {k: again[k] for k in COLL} == {k: once[k] for k in COLL}

    check()


def test_a_deletion_is_never_forgotten_by_a_merge(impl):
    @given(logs())
    def check(pair):
        local, incoming = pair
        res = merge(impl, local, incoming)
        for k in COLL:
            got = {x["id"]: x for x in res[k]}
            for x in local.get(k, []) + incoming.get(k, []):
                if x.get("deleted") and ts(x) > ts(got[x["id"]]):
                    raise AssertionError("a newer tombstone lost to an older item")

    check()


def test_covered_means_every_item_is_there_and_as_new(impl):
    @given(logs())
    def check(pair):
        a, b = pair
        b = {k: v for k, v in b.items() if k in COLL}
        want = all(any(y["id"] == x["id"] and ts(y) >= ts(x) for y in b.get(k, [])) for k in COLL for x in a.get(k, []))
        assert impl(Input(op="covered", mine=a, theirs=b)).result is want

    check()
