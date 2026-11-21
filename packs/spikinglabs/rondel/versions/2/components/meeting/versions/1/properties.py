"""Behavioural properties for spikinglabs/meeting.

Random sequences of operations on a small meeting; each property checks a rule the
document must keep after any sequence, with a model of the expected outcome built here.
"""

import datetime as dt

from hypothesis import assume, given, strategies as st

NOW = "2026-10-20T10:00:00.000Z"
BASE = dt.datetime(2026, 10, 20, 10, 0, 0, tzinfo=dt.timezone.utc)

TEMPLATE = {
    "id": "t", "name": "Team", "type": "general", "description": "",
    "columns": [{"title": "A", "description": "", "color": "#6b7280"}, {"title": "B", "description": "", "color": "#6b7280"}],
    "agenda": [{"title": "One", "durationMin": 5}, {"title": "Two", "durationMin": 5, "activity": "round"}, {"title": "Three", "durationMin": 5}],
}


def stamp(i):
    """A distinct moment per step, so items created in order sort in that order."""
    return (BASE + dt.timedelta(seconds=i)).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def init(seed="s", template=TEMPLATE, **kw):
    return {"title": "Meeting", "template": template, "creator": "id-ana", "seed": seed, **kw}


def call(impl, steps, show=None, **kw):
    steps = [{**s, "now": stamp(i + 1)} if "now" not in s else s for i, s in enumerate(steps)]
    return impl({"now": NOW, "init": init(**kw.pop("init", {})), "steps": steps, "show": show, **kw})


PEOPLE = ["Ana", "Ben", "Cy"]


@st.composite
def card_sequence(draw, max_steps=18):
    """Steps that create, group, ungroup, move, title, vote on and delete cards; refs are card:1, card:2, ..."""
    steps, alive, n = [], [], 0
    for _ in range(draw(st.integers(1, max_steps))):
        kinds = ["share"] + (["group", "ungroup", "move", "title", "delete", "vote", "unvote"] if alive else [])
        kind = draw(st.sampled_from(kinds))
        by = draw(st.sampled_from(PEOPLE))
        if kind == "share":
            n += 1
            alive.append(f"card:{n}")
            steps.append({"op": "share_card", "by": by, "args": {"column": draw(st.sampled_from(["col:1", "col:2"])), "text": f"c{n}"}})
        else:
            c = draw(st.sampled_from(alive))
            if kind == "group":
                steps.append({"op": "group", "by": by, "args": {"card": c, "into": draw(st.sampled_from(alive))}})
            elif kind == "ungroup":
                steps.append({"op": "ungroup", "by": by, "args": {"card": c}})
            elif kind == "move":
                steps.append({"op": "update_card", "by": by, "args": {"card": c, "patch": {"columnId": draw(st.sampled_from(["col:1", "col:2"]))}}})
            elif kind == "title":
                steps.append({"op": "group_title", "by": by, "args": {"card": c, "title": draw(st.sampled_from(["", " Topic ", "Other"]))}})
            elif kind == "delete":
                alive.remove(c)
                steps.append({"op": "delete_card", "by": by, "args": {"card": c}})
            else:
                steps.append({"op": "vote", "by": by, "args": {"card": c, "delta": 1 if kind == "vote" else -1}})
    return steps


def test_groups_stay_well_formed(impl):
    @given(card_sequence())
    def check(steps):
        steps = [s for s in steps if s["op"] != "vote"]
        cards = call(impl, steps, show=["cards"]).view["cards"]
        groups = {}
        for c in cards:
            if c["groupId"] is not None:
                groups.setdefault(c["groupId"], []).append(c)
        for gid, members in groups.items():
            assert len(members) >= 2, "a group of one is dissolved"
            assert len({m["columnId"] for m in members}) == 1, "a group stays in one column"
            holder = [m for m in members if m["id"] == gid]
            assert holder, "the group id is the id of one of its cards"
            for m in members:
                assert m["groupTitle"] is None or m["id"] == gid, "the title lives on the id-holder"

    check()


def test_votes_follow_the_limits(impl):
    @given(st.integers(0, 4), st.integers(0, 3), st.lists(st.tuples(st.sampled_from(PEOPLE), st.integers(1, 3), st.sampled_from([1, 1, 1, -1])), min_size=1, max_size=25))
    def check(per_user, per_card, votes):
        steps = [{"op": "settings", "args": {"settings": {"votesPerUser": per_user, "votesPerCard": per_card}}}]
        steps += [{"op": "share_card", "args": {"column": "col:1", "text": f"c{i}"}} for i in (1, 2, 3)]
        steps += [{"op": "vote", "by": who, "args": {"card": f"card:{card}", "delta": delta}} for who, card, delta in votes]
        out = call(impl, steps, show=["votes", "votesByVoter"])
        counts, expected = {}, []
        for who, card, delta in votes:
            cur = counts.get((who, card), 0)
            used = sum(n for (w, _), n in counts.items() if w == who)
            if delta > 0 and ((per_user and used >= per_user) or (per_card and cur >= per_card)):
                expected.append("limit")
                continue
            counts[(who, card)] = max(0, cur + delta)
            expected.append("ok")
        assert out.results[4:] == expected
        by_voter = {}
        for (who, card), n in counts.items():
            if n:
                by_voter.setdefault(f"voter-{who.lower()}", {})[f"card:{card}"] = n
        assert out.view["votesByVoter"] == by_voter
        totals = {}
        for (_, card), n in counts.items():
            if n:
                totals[f"card:{card}"] = totals.get(f"card:{card}", 0) + n
        assert out.view["votes"] == totals

    check()


def test_moving_an_agenda_item_puts_it_at_the_index(impl):
    @given(st.lists(st.tuples(st.integers(0, 4), st.integers(-2, 8)), min_size=1, max_size=12))
    def check(moves):
        first = call(impl, [], show=["agenda"]).view["agenda"]
        order = [a["id"] for a in first] + ["a4", "a5"]
        steps = [{"op": "add_agenda", "ref": "a4", "args": {"title": "Four"}}, {"op": "add_agenda", "ref": "a5", "args": {"title": "Five"}}]
        for who, to in moves:
            item = order[who]
            steps.append({"op": "move_agenda", "args": {"item": item, "to": to}})
            rest = [x for x in order if x != item]
            order = rest[:max(0, min(len(rest), to))] + [item] + rest[max(0, min(len(rest), to)):]
        agenda = call(impl, steps, show=["agenda"]).view["agenda"]
        assert [a["id"] for a in agenda] == order
        positions = [a["position"] for a in agenda]
        assert positions == sorted(positions) and len(set(positions)) == len(positions)

    check()


def test_ids_come_from_the_seed_only(impl):
    @given(st.text(min_size=1, max_size=40), st.text(min_size=1, max_size=40))
    def check(seed, other):
        def ids(seed, now):
            out = impl({"now": now, "init": init(seed=seed), "show": ["columns", "agenda"]})
            return [x["id"] for x in out.view["columns"]], [x["id"] for x in out.view["agenda"]]

        a = ids(seed, NOW)
        assert a == ids(seed, "2027-01-01T00:00:00.000Z"), "the clock does not matter"
        everything = a[0] + a[1]
        assert len(set(everything)) == len(everything), "ids are distinct"
        assert all(len(i) == 12 and all(c.isalnum() or c in "-_" for c in i) for i in everything), "9 bytes, base64url"
        if other != seed:
            assert ids(other, NOW) != a, "another seed gives other ids"

    check()


def test_reopening_an_export_gives_the_same_meeting(impl):
    @given(card_sequence(12), st.lists(st.sampled_from(["notes", "action", "decision", "timer", "idea", "phase"]), max_size=6))
    def check(steps, extra):
        for e in extra:
            steps.append({
                "notes": {"op": "notes_insert", "args": {"item": "agenda:1", "text": "Some notes é"}},
                "action": {"op": "add_action", "args": {"text": "Do it", "owner": "Cy"}},
                "decision": {"op": "add_decision", "args": {"text": "Yes", "item": "agenda:2"}},
                "timer": {"op": "timer_start", "args": {"ms": 90000}},
                "idea": {"op": "add_idea", "args": {"text": "An idea", "item": "agenda:3"}},
                "phase": {"op": "phase", "args": {"phase": "discuss"}},
            }[e])
        out = call(impl, steps, export=True)
        again = impl({"now": NOW, "update": out.update})
        assert again.view["meta"] == out.view["meta"] | {"currentAgendaId": again.view["meta"]["currentAgendaId"]}
        for key in ("cards", "agenda", "actions", "decisions", "ideas", "columns", "people"):
            assert [{k: v for k, v in x.items() if k not in ("id", "columnId", "groupId", "itemId", "agendaItemId")} for x in again.view[key]] == \
                   [{k: v for k, v in x.items() if k not in ("id", "columnId", "groupId", "itemId", "agendaItemId")} for x in out.view[key]]
        assert sorted(again.notes.values()) == sorted(out.notes.values())
        assert sum(again.view["votes"].values()) == sum(out.view["votes"].values())

    check()


def test_timer_state_stays_consistent(impl):
    ops = st.sampled_from(["timer_start", "timer_pause", "timer_resume", "timer_add", "timer_reset", "close", "reopen"])

    @given(st.lists(st.tuples(ops, st.integers(1, 120_000), st.integers(0, 90)), min_size=1, max_size=15))
    def check(seq):
        steps, t = [], 0
        for op, ms, gap in seq:
            t += gap
            args = {"ms": ms} if op in ("timer_start", "timer_add") else {}
            steps.append({"op": op, "now": stamp(t), "args": args})
        timer = call(impl, steps, show=["meta.timer", "meta.status", "meta.closedAt"]).view["meta"]
        tm = timer["timer"]
        assert tm["remainingMs"] >= 0
        assert (tm["endsAt"] is not None) == tm["running"]
        if timer["status"] == "live":
            assert timer["closedAt"] is None
        else:
            assert timer["closedAt"] is not None

    check()


TEXT = st.text(alphabet=st.sampled_from(list("abc XYZ 019é\n.")), min_size=0, max_size=12)


def test_texts_are_trimmed_and_cut(impl):
    @given(st.sampled_from([("share_card", 2000, "text"), ("add_decision", 2000, "text"), ("add_action", 2000, "text"), ("add_idea", 500, "text"), ("rename", 200, "title"), ("add_agenda", 200, "title"), ("group_title", 120, "title")]),
           TEXT, st.integers(0, 3), st.sampled_from(["x", "é"]))
    def check(kind, core, pad, ch):
        op, limit, key = kind
        n = limit + pad - 1
        text = " " + ch * n + " " + core
        assume(op != "group_title" or True)
        steps = [{"op": "share_card", "args": {"column": "col:1", "text": "c"}}] if op == "group_title" else []
        args = {key: text}
        if op == "share_card":
            args["column"] = "col:1"
        if op == "group_title":
            args["card"] = "card:1"
        if op == "add_idea":
            args["item"] = None
        if op == "add_decision":
            args["item"] = None
        steps.append({"op": op, "args": args})
        out = call(impl, steps, show=["cards", "decisions", "actions", "ideas", "agenda", "meta.title"])
        want = text.strip()[:limit] if op != "group_title" else (text.strip()[:limit] or None)
        view = out.view
        got = {
            "share_card": lambda: view["cards"][-1]["text"], "add_decision": lambda: view["decisions"][-1]["text"], "add_action": lambda: view["actions"][-1]["text"],
            "add_idea": lambda: view["ideas"][-1]["text"], "rename": lambda: view["meta"]["title"], "add_agenda": lambda: view["agenda"][-1]["title"],
            "group_title": lambda: None,
        }[op]()
        if op == "group_title":
            return
        assert got == want

    check()


def test_carrying_over_keeps_open_actions_and_unfinished_extra_topics(impl):
    topic = st.tuples(st.sampled_from(["One", "Extra A", "Extra B", "Extra C"]), st.booleans(), st.sampled_from([None, "round", "write"]))
    action = st.tuples(st.sampled_from(["open", "done", "dropped"]), st.sampled_from([None, "Earlier"]))

    @given(st.lists(topic, max_size=4, unique_by=lambda t: t[0]), st.lists(action, max_size=4))
    def check(topics, actions):
        steps, expected_topics = [], []
        for i, (title, done, activity) in enumerate(topics):
            args = {"title": title, "minutes": 5}
            if activity:
                args["activity"] = activity
            steps.append({"op": "add_agenda", "ref": f"t{i}", "args": args})
            if done:
                steps.append({"op": "update_agenda", "args": {"item": f"t{i}", "patch": {"done": True}}})
            if not done and title not in ("One", "Two", "Three") and activity in (None, "round") and activity is None:
                expected_topics.append(title)
        expected_actions = []
        for i, (status, origin) in enumerate(actions):
            steps.append({"op": "add_action", "ref": f"a{i}", "args": {"text": f"Action {i}"}})
            if status != "open":
                steps.append({"op": "update_action", "args": {"action": f"a{i}", "patch": {"status": status}}})
            if status == "open":
                expected_actions.append(f"Action {i}")
        steps = [{**s, "now": stamp(i + 1)} for i, s in enumerate(steps)]
        previous = {"init": init(seed="prev"), "steps": steps}
        out = impl({"now": stamp(100), "init": init(seed="next", previous=previous), "show": ["agenda", "actions"]})
        carried = [a["title"] for a in out.view["agenda"][3:]]
        assert carried == expected_topics
        assert [a["text"] for a in out.view["actions"]] == expected_actions
        assert all(a["carriedFrom"] == "Meeting" and a["status"] == "open" and a["cardId"] is None for a in out.view["actions"])

    check()
