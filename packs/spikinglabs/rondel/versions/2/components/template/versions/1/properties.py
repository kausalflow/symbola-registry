"""Behavioural properties for spikinglabs/template."""

import json
import re

from hypothesis import given, strategies as st

from schema import Input

ACTIVITIES = ["topic", "round", "brainstorm", "write", "group", "vote", "discuss", "actions", "break"]
BOARD = {"write", "group", "vote", "discuss", "actions"}
TEXT = st.text(alphabet=st.sampled_from(list("abcXYZ 019:#-'\"é,[]{}!&*?|>%@`")), min_size=1, max_size=14).map(str.strip).filter(bool)
BLOCKS = ["board", "brainstorm", "topic", "actions", "decisions", "people"]
SIDE = ["agenda", "people", "board", "brainstorm", "topic", "actions", "decisions"]


def call(impl, **kw):
    return impl(Input(**kw)).result


def slug(s):
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", s.lower()))[:48]


@st.composite
def templates(draw):
    name = draw(TEXT)
    columns = [{"title": draw(TEXT), "description": draw(st.one_of(st.just(""), TEXT)), "color": "#6b7280"} for _ in range(draw(st.integers(0, 4)))]
    agenda = []
    for _ in range(draw(st.integers(0, 5))):
        item = {"title": draw(TEXT), "durationMin": draw(st.integers(0, 600))}
        activity = draw(st.sampled_from(ACTIVITIES))
        if activity != "topic":
            item["activity"] = activity
        if draw(st.booleans()):
            item["owner"] = draw(TEXT)
        if draw(st.booleans()):
            item["notes"] = (draw(TEXT) + draw(st.sampled_from(["", "\nmore: lines\n", "\n"]))).strip()
        if draw(st.booleans()):
            screen = {}
            mids = draw(st.lists(st.sampled_from(BLOCKS), min_size=1, max_size=2, unique=True))
            screen["middle"] = mids
            for k in draw(st.lists(st.sampled_from(SIDE), unique=True, max_size=3)):
                screen[k] = draw(st.sampled_from(["open", "folded"]))
            item["screen"] = screen
        agenda.append(item)
    t = {"id": slug(name) or "template", "name": name, "type": draw(st.sampled_from(["retro", "standup", "planning", "one_on_one", "general"])), "description": draw(st.one_of(st.just(""), TEXT)), "columns": columns, "agenda": agenda}
    if draw(st.booleans()):
        t["title"] = draw(TEXT)
    settings = {}
    for k, v in (("showAuthors", st.booleans()), ("votesPerUser", st.integers(0, 99)), ("votesPerCard", st.integers(0, 99)), ("secretVoting", st.booleans()), ("openBoard", st.booleans())):
        if draw(st.booleans()):
            settings[k] = draw(v)
    if settings:
        t["settings"] = settings
    return t


def test_a_saved_template_reads_back_the_same(impl):
    @given(templates())
    def check(t):
        got = call(impl, op="roundtrip", template=t)
        assert got["errors"] == []
        assert got["template"] == t
        saved = call(impl, op="to_yaml", template=t)
        assert saved["order"] == [k for k in ("name", "type", "description", "title", "columns", "agenda", "settings") if k in saved["data"]]
        assert "id" not in saved["data"]

    check()


def test_the_id_is_the_slug_of_the_name_or_the_given_id(impl):
    @given(st.text(alphabet=st.sampled_from(list("abcXYZ 019-_!?.é")), min_size=1, max_size=40).map(str.strip).filter(bool), st.sampled_from(["", "my-", "org-"]), st.booleans())
    def check(name, prefix, with_id):
        yaml = (f"id: {json.dumps(name)}\n" if with_id else "") + f"name: {json.dumps('Some name' if with_id else name)}\n"
        got = call(impl, op="parse", yaml=yaml, id_prefix=prefix)
        assert got["errors"] == [] and got["template"]["id"] == prefix + (slug(name) or "template")

    check()


def test_numbers_and_lengths_are_checked_exactly(impl):
    @given(st.integers(-3, 700), st.integers(-3, 105), st.integers(0, 90))
    def check(minutes, votes, pad):
        bad_lines = lambda y: [e["line"] for e in call(impl, op="parse", yaml=y)["errors"]]
        assert bad_lines(f"name: M\nagenda:\n  - title: T\n    minutes: {minutes}\n") == ([] if 0 <= minutes <= 600 else [4])
        assert bad_lines(f"name: M\nsettings:\n  votes_per_card: {votes}\n") == ([] if 0 <= votes <= 99 else [3])
        assert bad_lines("name: " + "n" * (70 + pad) + "\n") == ([] if 70 + pad <= 80 else [1])

    check()


def test_an_unknown_field_is_an_error_at_its_line(impl):
    places = [
        ("name: M\n{k}: 1\n", 2), ("name: M\ncolumns:\n  - title: A\n    {k}: 1\n", 4), ("name: M\nagenda:\n  - title: A\n    {k}: 1\n", 4),
        ("name: M\nagenda:\n  - title: A\n    screen:\n      {k}: open\n", 5), ("name: M\nsettings:\n  {k}: true\n", 3),
    ]

    @given(st.sampled_from(places), st.text(alphabet="qxz", min_size=3, max_size=6))
    def check(place, key):
        yaml, line = place
        got = call(impl, op="parse", yaml=yaml.replace("{k}", "zz" + key))
        assert got["template"] is None and got["errors"] == [{"line": line}]

    check()


def test_design_warnings_follow_the_rules(impl):
    stage = st.tuples(st.sampled_from(ACTIVITIES), st.sampled_from([0, 1, 10, 45, 60]))

    @given(st.lists(stage, max_size=7), st.booleans())
    def check(stages, with_columns):
        t = {"id": "t", "name": "T", "type": "general", "description": "", "columns": [{"title": "c", "description": "", "color": "#6b7280"}] if with_columns else [],
             "agenda": [{"title": f"S{i}", "durationMin": m, "activity": a} for i, (a, m) in enumerate(stages)]}
        kinds = [a for a, _ in stages]
        first = lambda a: kinds.index(a) if a in kinds else -1
        want = []
        if not stages:
            want.append("no-stages")
        if any(k in BOARD for k in kinds) and not with_columns:
            want.append("no-columns")
        if first("vote") >= 0 and first("write") >= 0 and first("vote") < first("write"):
            want.append("vote-before-write")
        if first("group") >= 0 and first("write") >= 0 and first("group") < first("write"):
            want.append("group-before-write")
        if first("discuss") >= 0 and first("vote") >= 0 and first("discuss") < first("vote"):
            want.append("discuss-before-vote")
        if sum(m for _, m in stages) > 90 and "break" not in kinds:
            want.append("no-break")
        want += [f"no-time:S{i}" for i, (_, m) in enumerate(stages) if m == 0]
        assert call(impl, op="design_checks", template=t) == want

    check()


def test_a_new_version_gets_a_name_nobody_has(impl):
    @given(st.text(alphabet=st.sampled_from(list("abcXYZ ")), min_size=1, max_size=10).map(str.strip).filter(bool), st.sampled_from(["", " (v2)", " (v5)", " (my version)"]),
           st.lists(st.sampled_from(["", " (v2)", " (v3)", " (v4)", " (V3)", " (v6)"]), max_size=5))
    def check(base, suffix, taken_suffixes):
        taken = [base + s for s in taken_suffixes] + [base.upper()]
        text = call(impl, op="new_version", yaml=f"id: old\nname: {json.dumps(base + suffix)}\ntype: retro\n", taken=taken)
        lines = text.split("\n")
        assert lines[0].startswith("name: ") and lines[1] == "type: retro" and "id:" not in text
        new = json.loads(lines[0][6:])
        m = re.fullmatch(re.escape(base) + r" \(v(\d+)\)", new)
        assert m and int(m.group(1)) >= 2
        assert new.lower() not in {t.lower() for t in taken}
        start = int(re.search(r"v(\d+)", suffix).group(1)) + 1 if "(v" in suffix else 2
        n = start
        while f"{base} (v{n})".lower() in {t.lower() for t in taken}:
            n += 1
        assert int(m.group(1)) == n

    check()
