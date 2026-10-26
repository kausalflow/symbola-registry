"""Cases for the meeting component."""

T0 = "2026-10-20T10:00:00.000Z"


def at(minute, second=0):
    return f"2026-10-20T10:{minute:02d}:{second:02d}.000Z"


WEEKLY = {
    "id": "weekly", "name": "Team weekly", "type": "general", "description": "Weekly sync.", "title": "Team weekly {date}",
    "columns": [],
    "agenda": [
        {"title": "Review open actions", "durationMin": 5},
        {"title": "Updates", "durationMin": 15, "activity": "round", "owner": "Everyone", "notes": "What changed?"},
        {"title": "Any other business", "durationMin": 5},
    ],
}
RETRO = {
    "id": "retro", "name": "Sprint retro", "type": "retro", "description": "", "title": "Sprint retro - {month}",
    "columns": [
        {"title": "Went well", "description": "Wins", "color": "#16a34a"},
        {"title": "To improve", "description": "", "color": "#6b7280"},
    ],
    "agenda": [
        {"title": "Check-in", "durationMin": 3, "activity": "round"},
        {"title": "Write", "durationMin": 5, "activity": "write", "screen": {"middle": ["board"], "people": "folded"}},
        {"title": "Group", "durationMin": 5, "activity": "group"},
        {"title": "Vote", "durationMin": 3, "activity": "vote"},
        {"title": "Discuss", "durationMin": 20, "activity": "discuss"},
        {"title": "Agree actions", "durationMin": 0, "activity": "actions"},
    ],
}


def init(template=WEEKLY, **kw):
    return {"title": "", "template": template, "creator": "id-ana", "seed": "seed-1", **kw}


def run(steps=(), template=WEEKLY, now=T0, **kw):
    return {"now": now, "init": init(template, **kw), "steps": list(steps)}


def S(op, by="Ana", now=None, ref=None, **args):
    s = {"op": op}
    if by != "Ana":
        s["by"] = by
    if now:
        s["now"] = now
    if ref:
        s["ref"] = ref
    if args:
        s["args"] = args
    return s


def cards(n, column="col:1", start=1):
    return [S("share_card", now=at(start + i), column=column, text=f"Card {i + 1}") for i in range(n)]


INIT_ALL = ["meta.title", "meta.type", "meta.templateId", "meta.createdAt", "meta.createdBy", "meta.facilitators", "meta.settings", "meta.phase", "meta.status", "meta.readyEpoch", "columns", "agenda", "notes"]
SHOW = [
    ("blank title", INIT_ALL), ("a template without title", ["meta.title"]), ("retro: {month}", INIT_ALL + ["meta.template"]), ("an explicit title", ["meta.title"]),
    ("a retro without board", ["meta.phase"]), ("a general meeting with a board stage", ["meta.phase"]), ("saved defaults", ["meta.settings"]),
    ("series meeting", ["meta.facilitators", "meta.series", "meta.seriesName"]), ("another seed", ["columns", "agenda"]), ("a seed", ["columns", "agenda"]),
    ("prefilled notes", ["notes"]), ("next meeting", ["meta.title", "meta.seriesName", "meta.previousTitle", "meta.settings", "agenda", "actions", "notes"]),
    ("a carried action", ["meta.previousTitle", "actions"]),
    ("anonymous retro", ["cards"]), ("a card is signed", ["cards"]), ("a retro with an open board", ["cards"]), ("card text", ["cards"]), ("grouping", ["cards"]), ("a card dropped", ["cards"]), ("ungroup", ["cards"]),
    ("deleting a grouped", ["cards", "votes", "votesByVoter"]), ("deleting a column", ["columns", "cards"]), ("new columns", ["columns"]), ("move_column", ["columns"]),
    ("votes:", ["votes", "votesByVoter"]), ("zero limits", ["votes"]), ("a general meeting: 3", ["votes", "votesByVoter"]),
    ("phase actions", ["meta.settings"]), ("phase:", ["meta.phase", "meta.readyEpoch", "meta.settings"]), ("starting a board stage", ["meta.phase", "meta.readyEpoch", "meta.settings", "meta.timer", "meta.currentAgendaId", "agenda"]),
    ("set_current without", ["meta.timer", "meta.currentAgendaId", "agenda"]), ("timer:", ["meta.timer"]), ("timer_reset", ["meta.timer", "meta.status", "meta.closedAt"]), ("pause or resume", ["meta.timer"]),
    ("add_agenda", ["agenda", "meta.phase", "notes"]), ("move_agenda", ["agenda"]), ("deleting the current", ["meta.currentAgendaId", "agenda", "notes"]),
    ("shared notes", ["notes"]), ("rename", ["meta.title"]), ("settings merge", ["meta.settings"]),
    ("join:", ["people"]), ("remove_person", ["people", "meta.facilitators", "meta.removed"]),
    ("brainstorm:", ["ideas", "ideaVotes", "ideaVotesByVoter"]), ("brainstorm step", ["brainstorms"]), ("ideas become", ["ideas", "ideaVotes", "actions", "agenda", "notes"]),
    ("decisions and actions", ["decisions", "actions"]),
    ("a meeting file saved by Rondel 0.26", None), ("a meeting file saved by Rondel 0.27", ["meta.title", "meta.status", "actions", "people"]), ("a bare document", ["meta.title", "cards", "notes"]),
]


def cases():
    out = []

    def add(note, input, raises=None):
        out.append({"input": input, "note": note, **({"raises": raises} if raises else {})})

    # ---- starting a meeting
    add("blank title and a template title: {date} is filled in; a general meeting shows names, 3 votes, 1 per card", run())
    add("a template without title: name, en dash, date", run(template={**WEEKLY, "title": None} if False else {k: v for k, v in WEEKLY.items() if k != "title"}))
    add("retro: {month} in the title, retro settings, first board stage becomes the phase, screen kept", run(template=RETRO, title="  ", now="2026-03-05T09:00:00.000Z"))
    add("an explicit title is trimmed", run(title="  Planning Q4  "))
    add("a retro without board stages starts in write", run(template={**RETRO, "agenda": [{"title": "Talk", "durationMin": 5}]}))
    add("a general meeting with a board stage starts in that stage", run(template={**WEEKLY, "columns": [{"title": "Ideas", "description": "", "color": "#6b7280"}], "agenda": [{"title": "Vote", "durationMin": 5, "activity": "vote"}]}))
    add("saved defaults apply, the template's own settings win", run(defaults={"votesPerUser": 9, "openBoard": True, "showAuthors": False}, template={**WEEKLY, "settings": {"votesPerUser": 4}}))
    add("series meeting: facilitators replace the creator, series reference stored, series name kept", run(facilitators=["id-ben", "id-cy"], series={"id": "ser1", "key": "k", "occ": "2026-W43"}, series_name="Team weekly"))
    add("another seed gives other ids", run(seed="seed-2", template=RETRO))
    add("a seed longer than 255 characters", run(seed="x" * 300))
    add("a seed with accents and an emoji (UTF-16 code units)", run(seed="Sprint é 🎉"))
    add("prefilled notes", run(steps=[S("notes_insert", item="agenda:2", text=" Ana: done.")]))

    # ---- carrying over from the previous meeting
    prev_steps = [
        S("set_current", now=at(1), item="agenda:1", start_timer=False),
        S("add_agenda", now=at(2), title="Budget", minutes=10),
        S("add_agenda", now=at(3), title="Hiring", minutes=10, ref="hiring"),
        S("update_agenda", item="hiring", patch={"done": True}),
        S("add_action", now=at(4), text="Send the report", owner="Ben", due="2026-10-30"),
        S("add_action", now=at(5), text="Book the room"),
        S("update_action", action="action:2", patch={"status": "done"}),
        S("settings", settings={"votesPerUser": 7}),
        S("phase", phase="discuss"),
    ]
    prev = {"init": init(WEEKLY, title="Last week", seed="prev-seed", series_name="Team weekly"), "steps": prev_steps}
    add("next meeting: open actions and unfinished extra topics carry over, settings copied with votes hidden",
        {"now": at(30), "init": init(WEEKLY, title="This week", seed="next-seed", previous=prev), "steps": []})
    add("a carried action keeps its first origin when carried twice",
        {"now": at(30), "init": init(WEEKLY, title="Third", seed="third", previous={"init": init(WEEKLY, title="This week", seed="next-seed", previous=prev), "steps": []}), "steps": []})

    # ---- cards
    add("anonymous retro cards, text trimmed", run(cards(0) + [S("share_card", now=at(1), column="col:1", text="  hello  ", color="#fde68a")], template=RETRO))
    add("a card is signed in a general meeting with a board, and in a retro with an open board", run([
        S("share_card", now=at(1), column="col:1", text="by name"),
        S("settings", settings={"openBoard": True}),
        S("share_card", by="Ben", now=at(2), column="col:1", text="open board"),
    ], template={**RETRO, "type": "general"}))
    add("a retro with an open board signs live cards with the author's name", run([
        S("settings", settings={"openBoard": True}),
        S("share_card", by="Ben", now=at(2), column="col:1", text="open board"),
    ], template=RETRO))
    add("card text is cut at 2000 characters", run([S("share_card", now=at(1), column="col:1", text="y" * 2005)], template=RETRO))
    add("grouping: target becomes the group, titles on the group's first card, moving a card between columns moves its group", run(
        cards(3) + [S("group", card="card:2", into="card:1"), S("group_title", card="card:2", title="  Importer  "),
                    S("update_card", card="card:2", patch={"columnId": "col:2"}), S("share_card", now=at(9), column="col:1", text="solo")], template=RETRO))
    add("grouping moves the card into the target's column and resets its title", run(
        [S("share_card", now=at(1), column="col:1", text="a"), S("share_card", now=at(2), column="col:2", text="b"), S("group", card="card:1", into="card:2"), S("group_title", card="card:1", title="T")], template=RETRO))
    add("a card dropped on a group's member joins that group; moving the leader's group into another takes everyone along", run(
        cards(4) + [S("group", card="card:2", into="card:1"), S("group", card="card:4", into="card:3"), S("group", card="card:1", into="card:3")], template=RETRO))
    add("ungroup of the last-but-one member dissolves the group", run(
        cards(2) + [S("group", card="card:2", into="card:1"), S("group_title", card="card:1", title="Pair"), S("ungroup", card="card:2")], template=RETRO))
    add("ungroup of the id-holder in a group of three passes the group and its title on", run(
        cards(3) + [S("group", card="card:2", into="card:1"), S("group", card="card:3", into="card:1"), S("group_title", card="card:1", title="Trio"), S("ungroup", card="card:1")], template=RETRO))
    add("deleting a grouped card dissolves a group left with one card and removes its votes", run(
        cards(2) + [S("group", card="card:2", into="card:1"), S("vote", card="card:2", delta=1), S("delete_card", card="card:2")], template=RETRO))
    add("grouping a card onto itself or a missing card changes nothing", run(cards(1) + [S("group", card="card:1", into="card:1"), S("group", card="card:1", into="nope")], template=RETRO))
    add("deleting a column deletes its cards", run(cards(2) + [S("share_card", now=at(9), column="col:2", text="keep"), S("delete_column", column="col:1")], template=RETRO))
    add("new columns: trimmed, cut, coloured by count", run([
        S("add_column", title="  " + "T" * 90 + "  ", description="d" * 310),
        S("add_column", title="Third"),
        S("add_column", title="Fourth", color="#000000"),
    ], template=RETRO))
    add("move_column puts a column first, last and between", run([
        S("add_column", title="C"), S("add_column", title="D"),
        S("move_column", column="col:4", to=0), S("move_column", column="col:1", to=99), S("move_column", column="col:2", to=1),
    ], template=RETRO))

    # ---- votes
    add("votes: per-card and per-person limits refuse with 'limit', removing votes frees them", run(
        cards(3) + [S("vote", card="card:1", delta=1)] * 3 + [S("vote", card="card:2", delta=1), S("vote", card="card:3", delta=1)] * 2
        + [S("vote", card="card:2", delta=-1), S("vote", card="card:3", delta=1), S("vote", by="Ben", card="card:1", delta=1), S("vote", card="card:1", delta=-1),
           S("vote", card="card:1", delta=-1), S("vote", card="card:1", delta=-1), S("vote", card="card:1", delta=-1)], template=RETRO))
    add("zero limits mean unlimited", run(cards(1) + [S("settings", settings={"votesPerUser": 0, "votesPerCard": 0})] + [S("vote", card="card:1", delta=1)] * 8, template=RETRO))
    add("a general meeting: 3 votes per person, 1 per card", run(
        [S("share_card", now=at(i), column="col:1", text=f"c{i}") for i in range(1, 5)] + [S("vote", card=f"card:{i}", delta=1) for i in (1, 1, 2, 3, 4)], template={**RETRO, "type": "general"}))

    # ---- phases, agenda, timer
    add("phase: readyEpoch rises, discuss/actions reveal votes, others don't", run([S("phase", phase="vote"), S("phase", phase="discuss"), S("clear_ready")], template=RETRO))
    add("phase actions reveals the votes too", run([S("phase", phase="vote"), S("phase", phase="actions")], template=RETRO))
    add("starting a board stage switches the phase and starts the timer; leaving an item marks it done", run([
        S("set_current", now=at(1), item="agenda:2"), S("set_current", now=at(2), item="agenda:5"), S("set_current", now=at(3), item="agenda:6"),
    ], template=RETRO))
    add("set_current without timer on a plain item; a stage with 0 minutes starts no timer", run([S("set_current", item="agenda:1", start_timer=False), S("set_current", item="agenda:2")]))
    add("timer: pause, resume, add while running and paused, reset", run([
        S("timer_start", now=at(0), ms=60000, label="Round"),
        S("timer_add", now=at(0, 10), ms=30000),
        S("timer_pause", now=at(0, 20)),
        S("timer_add", ms=-5000), S("timer_resume", now=at(5)), S("timer_pause", now=at(5, 10)),
    ]))
    add("timer_reset and close", run([S("timer_start", now=at(1), ms=1000), S("timer_reset"), S("timer_start", now=at(2), ms=1000), S("close", now=at(3)), S("reopen", now=at(4))]))
    add("pause or resume when nothing applies change nothing", run([S("timer_pause"), S("timer_resume"), S("timer_start", now=at(1), ms=5000), S("timer_resume")]))
    add("add_agenda: appended, a board stage sets the phase only if none", run([
        S("add_agenda", now=at(1), title="  Extra  ", minutes=7, activity="vote"), S("add_agenda", now=at(2), title="Another", activity="discuss"), S("add_agenda", title="Plain", activity="topic"),
    ]))
    add("move_agenda moves to the front, the back and the middle", run([
        S("add_agenda", title="D"), S("move_agenda", item="agenda:4", to=0), S("move_agenda", item="agenda:1", to=3), S("move_agenda", item="agenda:3", to=1), S("move_agenda", item="agenda:2", to=-5),
    ]))
    add("deleting the current item clears currentAgendaId and drops its notes", run([S("set_current", item="agenda:1", start_timer=False), S("delete_agenda", item="agenda:1")]))
    add("shared notes are inserted at the end, or at a position", run([S("notes_insert", item="agenda:2", text="A"), S("notes_insert", item="agenda:2", text="B", at=0), S("notes_insert", item="agenda:1", text="first")]))
    add("rename: trimmed, cut at 200, empty ignored", run([S("rename", title="  New name "), S("rename", title="   "), S("rename", title="z" * 250)]))
    add("settings merge", run([S("settings", settings={"secretVoting": True}), S("settings", settings={"votesPerCard": 2})]))

    # ---- people
    add("join: refreshed only after 5 minutes or on a new name; a new name replaces the entry", run([
        S("join", now=at(0)), S("join", now=at(3)), S("join", now=at(6)), S("join", by="Ben", now=at(6)),
        S("join", by="Ben", now=at(7)),
    ]))
    add("remove_person: not the creator; drops facilitator; removed people cannot join; allow_back lets them in", run([
        S("join", now=at(1)), S("join", by="Ben", now=at(1)), S("add_facilitator", person="id-ben"), S("add_facilitator", person="id-ben"),
        S("remove_person", person="id-ana"), S("remove_person", person="id-ben"), S("remove_person", person="id-zed"),
        S("join", by="Ben", now=at(20)), S("allow_back", person="id-ben"), S("join", by="Ben", now=at(21)),
    ]))

    # ---- brainstorm, decisions, actions
    add("brainstorm: ideas per item, three dots each per item, stackable, limit applies per item", run([
        S("add_idea", now=at(1), text="  A  ", item="agenda:2"), S("add_idea", now=at(2), text="B", item="agenda:2"), S("add_idea", now=at(3), text="C", item="agenda:1"),
        S("add_idea", now=at(4), text="  "),
        S("vote_idea", idea="idea:1", delta=1), S("vote_idea", idea="idea:1", delta=1), S("vote_idea", idea="idea:2", delta=1), S("vote_idea", idea="idea:2", delta=1),
        S("vote_idea", idea="idea:3", delta=1), S("vote_idea", by="Ben", idea="idea:2", delta=1), S("vote_idea", idea="idea:1", delta=-1), S("vote_idea", idea="idea:2", delta=1),
    ]))
    add("brainstorm step and hidden flag merge with defaults", run([S("brainstorm", item="agenda:2", patch={"step": "vote"}), S("brainstorm", item="agenda:2", patch={"hidden": True}), S("brainstorm", patch={"hidden": True})]))
    add("ideas become actions or agenda items; deleting an idea removes its dots; editing", run([
        S("add_idea", now=at(1), text="Pair reviews\nweekly", item="agenda:1"), S("add_idea", now=at(2), text="Wednesday", item="agenda:1"), S("add_idea", now=at(3), text="Gone", item="agenda:1"),
        S("vote_idea", idea="idea:3", delta=1), S("edit_idea", idea="idea:2", text="  No-meeting Wednesday "), S("edit_idea", idea="idea:2", text=" "),
        S("idea_to_agenda", now=at(4), idea="idea:1"), S("idea_to_action", now=at(5), idea="idea:2"), S("delete_idea", idea="idea:3"),
    ]))
    add("decisions and actions: trimmed, owner, due, and card link", run([
        S("add_decision", now=at(1), text="  Ship it  ", item="agenda:1"), S("add_decision", now=at(2), text="Later", item=None),
        S("add_action", now=at(3), text="  Write docs ", owner="  Ben ", due=""), S("add_action", now=at(4), text="Fix", due="2026-11-01"),
        S("update_action", action="action:1", patch={"status": "dropped", "owner": "Cy"}), S("delete_action", action="action:2"), S("delete_decision", decision="decision:2"),
    ]))

    # ---- opening saved meetings (older versions must keep opening)
    add("a meeting file saved by Rondel 0.26.0", {"now": T0, "file": {"$fixture": "meeting-file-0.26.0.json"}})
    add("a meeting file saved by Rondel 0.27.0, given as text, continuing with steps", {"now": "2026-10-21T08:00:00.000Z", "file": {"$text": "meeting-file-0.27.0.json"}, "steps": [
        S("reopen", now="2026-10-21T08:00:00.000Z"), S("add_action", now="2026-10-21T08:01:00.000Z", text="Follow up", owner="Ana"), S("join", by="Cy", now="2026-10-21T08:02:00.000Z")]})
    add("a bare document update (from a meeting file)", {"now": T0, "update": {"$fixture": "update-0.27.0.json"}})
    add("a file that is not JSON", {"now": T0, "file": "not json"}, "ValueError")
    add("a file of another kind", {"now": T0, "file": {"format": "rondel-backup", "version": 1}}, "ValueError")
    add("an empty document is not a meeting", {"now": T0, "update": "AAA="}, "ValueError")
    for c in out:
        for key, show in SHOW:
            if c["note"].startswith(key):
                c["input"]["show"] = show
                break
    return out
