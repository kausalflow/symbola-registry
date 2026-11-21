"""Behavioural properties for spikinglabs/save-guard."""

from hypothesis import given, strategies as st

from schema import Input

COLL = ["children", "episodes", "entries", "meds", "measurements", "growth", "products", "vaccines", "checkups", "dental", "appts", "emergency", "docs", "pages"]


def good(n, example=False, v=3):
    s = {"app": "aura", "v": v, "settings": {}, **{k: [] for k in COLL}}
    for i in range(n):
        s[COLL[i % 3]].append({"id": f"i{i}"})
    if example:
        s["example"] = True
    return s


def broken(kind):
    s = good(2)
    if kind == "settings":
        s["settings"] = None
    elif kind == "list":
        s["entries"] = {"id": "x"}
    elif kind == "id":
        s["entries"] = [{"note": "no id"}]
    else:
        del s["docs"]
    return s


@st.composite
def histories(draw):
    steps = []
    for _ in range(draw(st.integers(1, 8))):
        what = draw(st.sampled_from(["good", "good", "good", "example", "broken", "new"]))
        n = draw(st.integers(0, 9))
        state = good(n, example=what == "example", v=4 if what == "new" else 3) if what != "broken" else broken(draw(st.sampled_from(["settings", "list", "id", "docs"])))
        steps.append({"state": state, "allow_shrink": draw(st.integers(0, 4)) == 0})
    return steps


def model(steps):
    out, bar, ex, allow = [], None, False, False
    for s in steps:
        st_ = s["state"]
        allow = s["allow_shrink"]  # used up by this attempt, whatever its outcome
        if st_["v"] > 3:
            out.append(("too-new")); continue
        if st_.get("settings") is None or not all(isinstance(st_.get(k), list) and all(x.get("id") is not None for x in st_[k]) for k in COLL):
            out.append("malformed"); continue
        n = sum(len(st_[k]) for k in COLL)
        if bar is not None and n < bar and not ex and not allow:
            out.append("shrunk"); continue
        bar, ex = n, bool(st_.get("example"))
        out.append(None)
    return out


def test_the_guard_follows_its_rules_over_a_run_of_saves(impl):
    @given(histories())
    def check(steps):
        got = impl(Input(steps=steps)).results
        want = model(steps)
        assert [r.refused for r in got] == want
        assert [r.saved for r in got] == [w is None for w in want]

    check()


def test_without_permission_a_smaller_log_is_never_saved(impl):
    @given(st.lists(st.integers(0, 12), min_size=2, max_size=8))
    def check(counts):
        got = impl(Input(steps=[{"state": good(n)} for n in counts])).results
        bar = 0
        for n, r in zip(counts, got):
            assert r.saved == (n >= bar)
            if r.saved:
                bar = n

    check()
