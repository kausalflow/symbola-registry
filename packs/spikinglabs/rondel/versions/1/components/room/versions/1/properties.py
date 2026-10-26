"""Behavioural properties for spikinglabs/room."""

import re

from hypothesis import given, strategies as st

from schema import Input

AUTH = "a-secret-auth-token"
NAMES = ["a", "b", "c"]


def hello(conn, auth=AUTH, since=0):
    return {"do": "send", "conn": conn, "frame": {"t": "hello", "v": 1, "auth": auth, "since": since}}


def join(conns, auth=AUTH):
    events = []
    for c in conns:
        events += [{"do": "open", "conn": c}, hello(c, auth)]
    return events


def run(impl, events, **kw):
    return impl(Input(events=events, **kw))


def test_updates_get_consecutive_numbers_and_reach_exactly_the_others(impl):
    @given(st.lists(st.tuples(st.sampled_from(NAMES), st.text(alphabet="abcXYZ=+/", min_size=1, max_size=6)), min_size=1, max_size=15))
    def check(sent):
        events = join(NAMES)
        for i, (who, data) in enumerate(sent, 1):
            events.append({"do": "send", "conn": who, "frame": {"t": "upd", "id": 100 + i, "data": data}})
        out = run(impl, events)
        assert [e["data"] for e in out.entries] == [d for _, d in sent] and [e["seq"] for e in out.entries] == list(range(1, len(sent) + 1))
        for c in NAMES:
            frames = out.frames[c][1:]
            acks = [f for f in frames if f["t"] == "ack"]
            relays = [f for f in frames if f["t"] == "upd"]
            mine = [(i, d) for i, (w, d) in enumerate(sent, 1) if w == c]
            assert [(f["id"] - 100, f["seq"]) for f in acks] == [(i, i) for i, _ in mine]
            assert [(f["seq"], f["data"]) for f in relays] == [(i, d) for i, (w, d) in enumerate(sent, 1) if w != c]

    check()


def test_a_newcomer_gets_what_is_after_since(impl):
    @given(st.integers(0, 6), st.integers(-2, 9))
    def check(n, since):
        events = join(["a"]) + [{"do": "send", "conn": "a", "frame": {"t": "upd", "id": i, "data": f"d{i}"}} for i in range(1, n + 1)]
        events += [{"do": "open", "conn": "b"}, hello("b", since=since)]
        welcome = run(impl, events).frames["b"][0]
        assert welcome["t"] == "welcome" and welcome["entryCount"] == n
        assert [e["seq"] for e in welcome["entries"]] == [s for s in range(1, n + 1) if s > since]

    check()


def test_only_the_first_proof_is_accepted_afterwards(impl):
    proofs = st.sampled_from(["first-proof-0123456789", "second-proof-0123456789", "third-proof-0123456789"])

    @given(proofs, st.lists(proofs, min_size=1, max_size=5))
    def check(first, later):
        events = [{"do": "open", "conn": "a"}, hello("a", first)]
        for i, p in enumerate(later):
            events += [{"do": "open", "conn": f"x{i}"}, hello(f"x{i}", p)]
        out = run(impl, events)
        for i, p in enumerate(later):
            frames = out.frames[f"x{i}"]
            if p == first:
                assert frames[0]["t"] == "welcome" and f"x{i}" not in out.closed
            else:
                assert frames == [{"t": "error", "code": "forbidden"}] and out.closed[f"x{i}"] == {"code": 4000, "reason": "forbidden"}

    check()


def test_compaction_keeps_one_snapshot_and_the_newer_entries(impl):
    @given(st.integers(1, 8), st.data())
    def check(n, data):
        up_to = data.draw(st.integers(1, n))
        events = join(["a"]) + [{"do": "send", "conn": "a", "frame": {"t": "upd", "id": i, "data": f"u{i}"}} for i in range(1, n + 1)]
        events.append({"do": "send", "conn": "a", "frame": {"t": "compact", "upTo": up_to, "data": "snap"}})
        entries = run(impl, events).entries
        assert [(e["seq"], e["data"]) for e in entries] == [(up_to, "snap")] + [(i, f"u{i}") for i in range(up_to + 1, n + 1)]

    check()


def test_peers_messages_carry_each_receivers_own_count(impl):
    @given(st.lists(st.sampled_from(["join", "leave"]), min_size=1, max_size=10))
    def check(plan):
        events, here, spare = [], [], list("abcdefghij")
        expected = {}
        for step in plan:
            if step == "join" and spare:
                c = spare.pop(0)
                events += [{"do": "open", "conn": c}, hello(c)]
                for o in here:
                    expected.setdefault(o, []).append({"t": "peers", "others": len(here), "joined": True})
                here.append(c)
                expected.setdefault(c, [])
            elif step == "leave" and here:
                c = here.pop(0)
                events.append({"do": "close", "conn": c})
                for o in here:
                    expected.setdefault(o, []).append({"t": "peers", "others": len(here) - 1, "joined": False})
        out = run(impl, events)
        for c, want in expected.items():
            assert [f for f in out.frames.get(c, []) if f["t"] == "peers"] == want

    check()


def test_room_ids_are_8_to_64_url_safe_characters(impl):
    @given(st.lists(st.text(alphabet=st.sampled_from(list("abcXYZ019-_ /.é\n")), max_size=70), max_size=8))
    def check(ids):
        out = run(impl, [], room_ids=ids)
        assert out.room_id_ok == [re.fullmatch(r"[A-Za-z0-9_-]{8,64}", i) is not None for i in ids]

    check()
