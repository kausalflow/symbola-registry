"""Cases for the template component."""


def case(note, op, raises=None, **kw):
    return {"input": {"op": op, **kw}, "note": note, **({"raises": raises} if raises else {})}


def parse(note, yaml, **kw):
    return case(note, "parse", yaml=yaml, **kw)


FULL = """name: Sprint retro
type: retro
description: Look back on the sprint.
title: Sprint retro {date}
columns:
  - title: Went well
    description: Wins worth repeating
    color: "#16a34a"
  - To improve
  - Ideas
agenda:
  - title: Check-in
    minutes: 5
    activity: round
    owner: Everyone
    notes: |
      One word for how the sprint felt.
  - title: Brainstorm
    activity: brainstorm
    screen:
      middle: [brainstorm, topic]
      people: folded
  - Wrap-up
settings:
  anonymous_cards: true
  votes_per_person: 5
  votes_per_card: 3
  secret_voting: true
  open_board: false
"""


def cases():
    out = []
    out.append({"input": {"op": "parse", "yaml": {"$text": "compat-retro.yaml"}}, "note": "the template of Rondel 0.27.0's compatibility test (every field)"})
    out.append(parse("a full template: plain lines are columns and agenda items, defaults fill the rest", FULL))
    out.append(parse("only a name", "name: Quick chat\n"))
    out.append(parse("id given: slug of it, with a prefix", "id: My Weird_ID!! 2\nname: X\n", id_prefix="org-"))
    out.append(parse("the id comes from the name", "name: Sprint-Retro (Team A)\n", id_prefix="my-"))
    out.append(parse("a name with no letters or digits has the id 'template'", "name: ✨✨\n"))
    out.append(parse("a long id is cut at 48 characters", "id: " + "word-" * 20 + "\nname: Long\n"))
    out.append(parse("a name given as a number", "name: 42\n"))
    out.append(parse("a name of exactly 80 characters is fine, 81 is an error", "name: " + "a" * 80 + "\n"))
    out.append(parse("81 characters", "name: " + "a" * 81 + "\n"))
    out.append(parse("name is required", "type: retro\n"))
    out.append(parse("surrounding spaces are trimmed", "name: '  Padded  '\ndescription: ' d '\n"))
    out.append(parse("a typo in a top-level field", "name: Weekly\ncolums:\n  - A\n"))
    out.append(parse("type must be a known one", "name: Weekly\ntype: weekly\n"))
    out.append(parse("every meeting type", "name: A\ntype: one_on_one\n"))
    out.append(parse("mistakes are reported with their lines", "name: Weekly\ntype: weekly\nagenda:\n  - title: Updates\n    minuets: 10\n  - title: AOB\n    minutes: ten\n"))
    for m in ("0", "600", "601", "-1", "5.5", '"5"', "true"):
        out.append(parse(f"minutes: {m}", f"name: M\nagenda:\n  - title: T\n    minutes: {m}\n"))
    out.append(parse("activity: not known", "name: M\nagenda:\n  - title: T\n    activity: party\n"))
    out.append(parse("activity: null means topic; topic is not written down", "name: M\nagenda:\n  - title: T\n    activity: null\n  - title: U\n    activity: topic\n"))
    out.append(parse("every activity", "name: M\nagenda:\n" + "".join(f"  - title: {a}\n    activity: {a}\n" for a in ("topic", "round", "brainstorm", "write", "group", "vote", "discuss", "actions", "break"))))
    out.append(parse("an agenda item needs a title", "name: M\nagenda:\n  - minutes: 5\n  - {}\n  - 7\n"))
    out.append(parse("a number as a whole item is an error; as a title it is text", "name: M\nagenda:\n  - 7\n  - title: 8\n"))
    out.append(parse("agenda must be a list", "name: M\nagenda: Updates\n"))
    out.append(parse("owner and notes limits", "name: M\nagenda:\n  - title: T\n    owner: " + "o" * 81 + "\n    notes: " + "n" * 4001 + "\n"))
    out.append(parse("empty notes and owner are left out", "name: M\nagenda:\n  - title: T\n    owner: ''\n    notes: ''\n"))
    out.append(parse("screen: a single block, duplicates, folded and open", "name: M\nagenda:\n  - title: T\n    screen:\n      middle: board\n      agenda: folded\n      decisions: open\n  - title: U\n    screen:\n      middle: [board, board]\n"))
    out.append(parse("screen: three entries in middle are too many, even with duplicates", "name: M\nagenda:\n  - title: T\n    screen:\n      middle: [board, board, topic]\n"))
    out.append(parse("screen: errors", "name: M\nagenda:\n  - title: T\n    screen:\n      middle: [board, topic, actions]\n      people: hidden\n      sky: open\n  - title: U\n    screen: folded\n  - title: V\n    screen: []\n"))
    out.append(parse("an empty screen is left out", "name: M\nagenda:\n  - title: T\n    screen: {}\n"))
    out.append(parse("a column with only a description", "name: M\ncolumns:\n  - description: no title\n  - title: Ok\n    colour: red\n"))
    out.append(parse("column colours: valid, short, wrong", "name: M\ncolumns:\n  - {title: A, color: '#16A34A'}\n  - {title: B, color: '#fff'}\n  - {title: C, color: green}\n  - {title: D, color: 12}\n"))
    out.append(parse("up to 12 columns", "name: M\ncolumns:\n" + "".join(f"  - C{i}\n" for i in range(12))))
    out.append(parse("13 columns", "name: M\ncolumns:\n" + "".join(f"  - C{i}\n" for i in range(13))))
    out.append(parse("41 agenda items", "name: M\nagenda:\n" + "".join(f"  - A{i}\n" for i in range(41))))
    out.append(parse("column limits", "name: M\ncolumns:\n  - title: " + "t" * 81 + "\n    description: " + "d" * 301 + "\n"))
    out.append(parse("columns must be a list", "name: M\ncolumns: A, B\n"))
    out.append(parse("settings: every field, and the inverse of anonymous", "name: M\nsettings:\n  anonymous_cards: false\n  votes_per_person: 0\n  votes_per_card: 99\n  secret_voting: false\n  open_board: true\n"))
    out.append(parse("settings: wrong values", "name: M\nsettings:\n  anonymous_cards: yes please\n  votes_per_person: 100\n  votes_per_card: 2.5\n  secret_voting: 1\n  loud: true\n"))
    out.append(parse("settings must be a mapping", "name: M\nsettings: [a]\n"))
    out.append(parse("empty settings are left out", "name: M\nsettings: {}\n"))
    out.append(parse("description too long and title too long", "name: M\ndescription: " + "d" * 201 + "\ntitle: " + "t" * 121 + "\n"))
    out.append(parse("an empty title is the same as none", "name: M\ntitle: ''\n"))
    out.append(parse("a YAML syntax error", "name: [unclosed\n"))
    out.append(parse("a repeated key", "name: A\nname: B\n"))
    out.append(parse("tabs in indentation", "name: A\nagenda:\n\t- B\n"))
    out.append(parse("not a mapping", "- a\n- b\n"))
    out.append(parse("an empty file", ""))
    out.append(parse("comments only", "# nothing here\n"))

    tpl = {"id": "t", "name": "Team weekly", "type": "general", "description": "Weekly.", "title": "Team {date}",
           "columns": [{"title": "Wins", "description": "What went well", "color": "#16a34a"}, {"title": "Blockers", "description": "", "color": "#6b7280"}],
           "agenda": [{"title": "Check-in", "durationMin": 5, "activity": "round", "owner": "Everyone", "notes": "One word.\nThen more: yes"}, {"title": "Updates", "durationMin": 15},
                      {"title": "Discuss", "durationMin": 0, "activity": "discuss", "screen": {"middle": ["board", "topic"], "people": "folded"}}],
           "settings": {"showAuthors": False, "votesPerUser": 0, "votesPerCard": 2, "secretVoting": True, "openBoard": True}}
    out.append(case("saved as YAML: names, order, only what is set", "to_yaml", template=tpl))
    out.append(case("a minimal template saves only name and type", "to_yaml", template={"id": "x", "name": "Bare", "type": "retro", "description": "", "columns": [], "agenda": []}))
    out.append(case("texts that look like YAML or numbers survive", "to_yaml", template={"id": "x", "name": "123", "type": "general", "description": "yes: no # not a comment", "columns": [{"title": "true", "description": "", "color": "#6b7280"}], "agenda": [{"title": "- dash", "durationMin": 5, "notes": "line1\nline2\n"}]}))

    out.append(case("reading back a saved template gives the same template, colours aside", "roundtrip", template=tpl))
    y = "id: weekly\nname: Weekly\nagenda:\n  - A\n"
    out.append(case("new version: the id line goes, the name becomes (v2)", "new_version", yaml=y, taken=["Weekly"]))
    out.append(case("(v2) becomes (v3)", "new_version", yaml='name: "Weekly (v2)"\n', taken=["Weekly", "Weekly (v2)"]))
    out.append(case("names in use are skipped, ignoring case", "new_version", yaml="name: Weekly\n", taken=["weekly (V2)", "WEEKLY (v3)"]))
    out.append(case("(my version) is a version suffix too", "new_version", yaml="name: Retro (my version)\n", taken=[]))
    out.append(case("(v7) counts on from 8", "new_version", yaml="name: Retro (v7)\n", taken=["Retro (v8)"]))
    out.append(case("a name needing quotes is written as a JSON string", "new_version", yaml="name: 'Plan: Q4 \"big\"'\ntype: planning\n", taken=[]))
    out.append(case("no name line: one is added at the top", "new_version", yaml="type: retro\ndescription: d\n", taken=[]))
    out.append(case("only the first id: and name: lines count", "new_version", yaml="# c\nid: a\nname: N\nagenda:\n  - title: T\n    notes: |\n      id: keep\n      name: keep\n", taken=[]))

    def stages(*items, columns=()):
        return {"id": "t", "name": "T", "type": "general", "description": "", "columns": [{"title": c, "description": "", "color": "#6b7280"} for c in columns], "agenda": [{"title": t, "durationMin": m, **({"activity": a} if a else {})} for t, m, a in items]}

    out.append(case("a calm design has no warnings", "design_checks", template=stages(("A", 10, "write"), ("B", 5, "group"), ("C", 3, "vote"), ("D", 20, "discuss"), columns=["x"])))
    out.append(case("no stages", "design_checks", template=stages()))
    out.append(case("board stages without columns", "design_checks", template=stages(("A", 5, "write"))))
    out.append(case("a plain meeting needs no columns", "design_checks", template=stages(("A", 5, None), ("B", 5, "round"))))
    out.append(case("voting, grouping and discussing out of order", "design_checks", template=stages(("V", 5, "vote"), ("G", 5, "group"), ("D", 5, "discuss"), ("W", 5, "write"), columns=["x"])))
    out.append(case("discuss before vote only", "design_checks", template=stages(("W", 5, "write"), ("D", 5, "discuss"), ("V", 5, "vote"), columns=["x"])))
    out.append(case("exactly 90 minutes need no break; 91 do; a break helps", "design_checks", template=stages(("A", 90, None))))
    out.append(case("91 minutes", "design_checks", template=stages(("A", 91, None))))
    out.append(case("91 minutes with a break", "design_checks", template=stages(("A", 90, None), ("B", 1, "break"))))
    out.append(case("stages without time", "design_checks", template=stages(("Open", 0, None), ("Next", 5, None), ("Round", 0, "round"))))

    view = {"meta": {"title": "Sprint 42 retro", "type": "retro", "seriesName": None, "settings": {"showAuthors": False, "votesPerUser": 5, "votesPerCard": 3, "secretVoting": True, "votesRevealed": True, "openBoard": False}},
            "columns": [{"id": "c1", "title": "Went well", "description": "Wins", "color": "#16a34a", "position": 1}],
            "agenda": [{"id": "a1", "title": "Check-in", "durationMin": 5, "owner": "Everyone", "done": True, "position": 1, "activity": "round"}, {"id": "a2", "title": "Talk", "durationMin": 10, "owner": "", "done": False, "position": 2, "activity": "topic", "screen": {"middle": ["board"]}}]}
    out.append(case("save a meeting as a template", "from_meeting", view=view))
    out.append(case("a series name names the template; open board is kept", "from_meeting", view={**view, "meta": {**view["meta"], "seriesName": "Team Retro!", "settings": {**view["meta"]["settings"], "openBoard": True}}}))
    out.append(case("the built-in templates", "builtin"))
    return out
