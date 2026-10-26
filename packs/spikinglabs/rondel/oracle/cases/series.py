"""Cases for the series component."""


def case(note, op, raises=None, **kw):
    return {"input": {"op": op, **kw}, "note": note, **({"raises": raises} if raises else {})}


def O(**statuses):
    return {k.replace("_", "-") if False else k: {"status": v} for k, v in statuses.items()}


def occs(*pairs):
    return {name: {"status": status} for name, status in pairs}


INFO = {
    "name": "Team weekly", "cadence": "weekly", "start": "2026-10-05T10:00", "durationMin": 45, "facilitators": [], "createdBy": "id-ana", "createdAt": "2026-10-01T09:00:00.000Z",
    "template": {"agenda": [{"title": "Review actions", "durationMin": 5}, {"title": "Updates", "durationMin": 15}, {"title": "AOB", "durationMin": 0}]},
}
NOW = "2026-10-17T12:00:00.000Z"
LINK = "https://rondel.example.com/#/s/abcdefgh/KEY123"


def cases():
    out = []
    # ---- periods
    for note, cad, date in [
        ("daily is the date", "daily", "2026-10-15"),
        ("weekly: a Sunday belongs to the week that began on Monday", "weekly", "2026-10-18"),
        ("weekly: the next Monday starts the next week", "weekly", "2026-10-19"),
        ("weekly: 1 January 2026 (Thursday) is in week 1", "weekly", "2026-01-01"),
        ("weekly: Monday 29 December 2025 is already 2026-W01", "weekly", "2025-12-29"),
        ("weekly: 3 January 2021 is in week 53 of 2020", "weekly", "2021-01-03"),
        ("weekly: Monday 30 December 2024 is 2025-W01", "weekly", "2024-12-30"),
        ("weekly: 31 December 2026 is week 53", "weekly", "2026-12-31"),
        ("weekly: week numbers have two digits", "weekly", "2026-02-02"),
        ("biweekly is weekly", "biweekly", "2026-10-15"),
        ("monthly pads the month", "monthly", "2026-03-31"),
        ("monthly: leap day", "monthly", "2024-02-29"),
        ("an irregular series has one period", "none", "2026-10-15"),
    ]:
        out.append(case(note, "period", cadence=cad, date=date))

    # ---- names and base periods
    for note, cad, occ in [
        ("weekly second meeting", "weekly", "2026-W42-2"),
        ("weekly first meeting", "weekly", "2026-W42"),
        ("monthly second meeting is not a date", "monthly", "2026-10-2"),
        ("monthly tenth meeting", "monthly", "2026-10-10"),
        ("daily third meeting", "daily", "2026-10-15-3"),
        ("an irregular series", "none", "all-3"),
        ("a name that is no period stays", "weekly", "custom"),
    ]:
        out.append(case(note, "base_period", cadence=cad, occ=occ))

    # ---- next period
    for note, cad, occ in [
        ("next week", "weekly", "2026-W42"),
        ("next week from a second meeting", "weekly", "2026-W42-2"),
        ("week 52 to 53 in a 53-week year", "weekly", "2026-W52"),
        ("week 53 to week 1", "weekly", "2026-W53"),
        ("week 52 to week 1 in a 52-week year", "weekly", "2025-W52"),
        ("next month", "monthly", "2026-10"),
        ("December to January", "monthly", "2026-12"),
        ("next month from a second meeting", "monthly", "2026-10-3"),
        ("next day", "daily", "2026-10-15"),
        ("end of February in a leap year", "daily", "2024-02-28"),
        ("end of month", "daily", "2026-10-31"),
        ("end of year", "daily", "2026-12-31-2"),
        ("irregular", "none", "all"),
        ("an unreadable name", "weekly", "custom"),
        ("biweekly counts as weekly", "biweekly", "2026-W10"),
    ]:
        out.append(case(note, "next_period", cadence=cad, occ=occ))

    # ---- next occurrence
    out.append(case("weekly: next week does not exist yet", "next_after", cadence="weekly", occ="2026-W42", occurrences=occs(("2026-W42", "live"))))
    out.append(case("weekly: next week was already started", "next_after", cadence="weekly", occ="2026-W42", occurrences=occs(("2026-W42", "live"), ("2026-W43", "live"))))
    out.append(case("irregular: the first free number", "next_after", cadence="none", occ="all", occurrences=occs(("all", "closed"), ("all-2", "closed"))))
    out.append(case("irregular: a gap is filled first", "next_after", cadence="none", occ="all-3", occurrences=occs(("all", "closed"), ("all-3", "closed"))))

    # ---- which meeting the link opens
    out.append(case("nothing yet: create", "decide", period="2026-W42", occurrences={}))
    out.append(case("a live meeting: open it", "decide", period="2026-W42", occurrences=occs(("2026-W42", "live"))))
    out.append(case("the only meeting is closed: say so, offer the next name", "decide", period="2026-W42", occurrences=occs(("2026-W42", "closed"))))
    out.append(case("a closed first meeting and a live second one: open the second", "decide", period="2026-W42", occurrences=occs(("2026-W42", "closed"), ("2026-W42-2", "live"))))
    out.append(case("two closed: offer the third", "decide", period="2026-W42", occurrences=occs(("2026-W42", "closed"), ("2026-W42-2", "closed"))))
    out.append(case("a deleted meeting is skipped and flagged", "decide", period="2026-W42", occurrences=occs(("2026-W42", "closed"), ("2026-W42-2", "deleted"))))
    out.append(case("another period's meetings do not count", "decide", period="2026-W43", occurrences=occs(("2026-W42", "live"), ("2026-W42-2", "closed"))))
    out.append(case("irregular series: the chain", "decide", period="all", occurrences=occs(("all", "closed"), ("all-2", "live"))))
    out.append(case("irregular series: nothing yet", "decide", period="all", occurrences={}))
    out.append(case("a gap does not hide a later meeting", "decide", period="2026-W42", occurrences=occs(("2026-W42", "live"), ("2026-W42-3", "live"))))
    out.append(case("latest meeting by creation time", "latest", occurrences={"a": {"createdAt": "2026-10-05T10:00:00.000Z"}, "b": {"createdAt": "2026-10-12T10:00:00.000Z"}, "c": {"createdAt": "2026-09-28T10:00:00.000Z"}}))
    out.append(case("no meetings, no latest", "latest", occurrences={}))

    # ---- titles
    for note, cad, per in [("week", "weekly", "2026-W42"), ("week with a leading zero", "weekly", "2026-W05"), ("month", "monthly", "2026-10"), ("day", "daily", "2026-10-05"), ("day, December", "daily", "2026-12-24"), ("a second meeting of the week keeps the week", "weekly", "2026-W42-2")]:
        out.append(case("label: " + note, "label", cadence=cad, period=per))

    # ---- rooms
    out.append(case("room of a meeting", "room", series_key="SeriesKeyForCompatTest_0123456789abcdef", occ="2026-W42"))
    out.append(case("another meeting of the series", "room", series_key="SeriesKeyForCompatTest_0123456789abcdef", occ="2026-W42-2"))
    out.append(case("another series key", "room", series_key="another-key", occ="2026-W42"))
    out.append(case("non-ASCII text is hashed as UTF-8", "room", series_key="Schlüssel", occ="2026-10"))

    # ---- calendar file
    out.append(case("weekly event with agenda", "ics", id="abcdefgh", info=INFO, link=LINK, now=NOW))
    for cad in ("daily", "biweekly", "monthly", "none"):
        out.append(case(f"event rule for {cad}", "ics", id="abcdefgh", info={**INFO, "cadence": cad, "template": {"agenda": []}}, link=LINK, now=NOW))
    out.append(case("escaping, a short duration, long folded lines and a multibyte name", "ics", id="id9", link="https://rondel.example.com/#/s/id9/" + "K" * 60,
                    info={**INFO, "name": "Plan; review, retro \\ more\nnext line é" + "ü" * 40, "durationMin": 1, "template": {"agenda": [{"title": "Ünïcode agenda item " * 6, "durationMin": 5}]}}, now="2026-01-02T03:04:05.678Z"))

    # ---- the series document
    for v in ("0.26.0", "0.27.0"):
        out.append(case(f"a series document saved by Rondel {v}", "document", update={"$fixture": f"series-update-{v}.json"}))
    tpl = INFO["template"]
    out.append(case("a new series document, meetings added and kept in step", "document", info=INFO, steps=[
        {"op": "add_occurrence", "args": {"occurrence": {"occ": "2026-W41", "title": "Team weekly W41", "status": "live", "createdAt": "2026-10-05T10:00:00.000Z", "closedAt": None}}},
        {"op": "add_occurrence", "args": {"occurrence": {"occ": "2026-W41", "title": "Other", "status": "closed", "createdAt": "2026-10-06T10:00:00.000Z", "closedAt": None}}},
        {"op": "sync_occurrence", "args": {"occ": "2026-W41", "title": "Team weekly W41 (renamed)", "status": "closed", "closedAt": "2026-10-05T10:45:00.000Z", "createdAt": "2026-10-09T00:00:00.000Z"}},
        {"op": "sync_occurrence", "args": {"occ": "2026-W42", "title": "New", "status": "live", "closedAt": None, "createdAt": "2026-10-12T10:00:00.000Z"}},
        {"op": "mark_deleted", "args": {"occ": "2026-W41"}},
        {"op": "sync_occurrence", "args": {"occ": "2026-W41", "title": "Back again", "status": "live", "closedAt": None, "createdAt": "x"}},
        {"op": "mark_deleted", "args": {"occ": "2026-W99"}},
    ]))
    out.append(case("facilitators: add, replace by id, remove; rename is trimmed and cut", "document", info=INFO, steps=[
        {"op": "add_facilitator", "args": {"facilitator": {"id": "id-ana", "name": "Ana"}}},
        {"op": "add_facilitator", "args": {"facilitator": {"id": "id-ben", "name": "Ben"}}},
        {"op": "add_facilitator", "args": {"facilitator": {"id": "id-ana", "name": "Ana B."}}},
        {"op": "remove_facilitator", "args": {"id": "id-ben"}},
        {"op": "rename", "args": {"name": "  Renamed  "}}, {"op": "rename", "args": {"name": "   "}}, {"op": "rename", "args": {"name": "n" * 130}},
    ]))
    out.append(case("older series documents lack optional keys: defaults apply", "document", info={"name": "Old", "template": tpl}))
    out.append(case("no op without a source", "document", raises="ValueError"))
    return out
