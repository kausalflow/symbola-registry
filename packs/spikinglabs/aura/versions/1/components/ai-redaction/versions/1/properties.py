"""Behavioural properties for spikinglabs/ai-redaction."""

from hypothesis import assume, given, strategies as st

from schema import Input

NAMES = ["Mia", "Jonas", "Amélie", "Zoe", "Björn", "Lena", "Oskar", "Yuki"]
FILLER = ["had a fever", "slept", "and", "(", ")", ",", ".", "\n", "drank 120 ml", "at 14:00"]
SYSTEM = "Summarise the log."


@st.composite
def calls(draw):
    names = draw(st.lists(st.sampled_from(NAMES), unique=True, min_size=2, max_size=6))
    kids = names[: draw(st.integers(1, min(3, len(names) - 1)))]
    adults = names[len(kids):]
    children = [{"id": f"c{i}", "name": n} for i, n in enumerate(kids)]
    me = adults[0]
    entries = [{"by": n} for n in adults[1:]]
    words = draw(st.lists(st.sampled_from(names + FILLER), min_size=1, max_size=12))
    return children, me, entries, " ".join(words), names, draw(st.integers(0, len(kids) - 1))


def run(impl, children, me, entries, user, child, **kw):
    return impl(Input(children=children, me=me, entries=entries, child=f"c{child}", system=SYSTEM, user=user, **kw))


def test_no_name_is_sent_and_the_answer_gets_them_back(impl):
    @given(calls())
    def check(c):
        children, me, entries, user, names, child = c
        out = run(impl, children, me, entries, user, child, reply=user)
        for n in names:
            assert n not in out.user, "a name was sent"
        assert out.result == user, "the placeholders were not turned back into the names"
        assert out.system == SYSTEM + " Names are replaced by placeholders such as [CHILD]; keep each placeholder exactly as written."

    check()


def test_the_child_asked_about_is_child_and_the_others_follow_in_order(impl):
    @given(calls())
    def check(c):
        children, me, entries, user, names, child = c
        out = run(impl, children, me, entries, children[child]["name"], child)
        assert out.user == "[CHILD]"
        others = [k for i, k in enumerate(children) if i != child]
        for j, k in enumerate(others, start=2):
            assert run(impl, children, me, entries, k["name"], child).user == f"[CHILD {j}]"
        assert run(impl, children, me, entries, me, child).user == "[PARENT 1]"
        for j, e in enumerate(entries, start=2):
            assert run(impl, children, me, entries, e["by"], child).user == f"[PARENT {j}]"

    check()


def test_a_name_inside_a_longer_word_stays(impl):
    @given(st.sampled_from(NAMES), st.sampled_from(["a", "x", "é", "ß", "я"]), st.booleans())
    def check(name, letter, before):
        word = letter + name if before else name + letter
        out = impl(Input(children=[{"id": "c1", "name": name}], child="c1", system=SYSTEM, user=f"{word} and {name}", reply=None))
        assert out.user == f"{word} and [CHILD]"

    check()


def test_images_need_the_own_service_and_are_counted(impl):
    @given(st.integers(1, 6), st.sampled_from(["own-key", "device", "off"]))
    def check(n, provider):
        kw = dict(children=[{"id": "c1", "name": "Mia"}], child="c1", system=SYSTEM, user="Mia", images=n, provider=provider, reply={})
        if provider != "own-key":
            try:
                impl(Input(**kw))
            except ValueError:
                return
            raise AssertionError("expected ValueError")
        assert impl(Input(**kw)).user == "[CHILD]\n\n" + (f"[{n} photos]" if n > 1 else "[1 photo]")

    check()
