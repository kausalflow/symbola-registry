"""Cases for the reminders component."""

NOW = "2026-10-27T12:00:00Z"


def t(*a, **kw):
    return {"type": "temp", **kw, "t": a[0], "tempC": a[1]}


def alerts(note, entries, start="2026-10-26T08:00:00Z", end=None, dob="2025-01-01"):
    return {"input": {"op": "alerts", "now": NOW, "child": {"dob": dob}, "episode": {"start": start, **({"end": end} if end else {})}, "entries": entries}, "note": note}


def med(note, meds, entries):
    return {"input": {"op": "medicine", "now": NOW, "meds": meds, "entries": [{"type": "med", **e} for e in entries]}, "note": note}


def backup(note, **state):
    return {"input": {"op": "backup", "now": NOW, "state": {"children": 1, **state}}, "note": note}


def rm(note, products, title, company=""):
    return {"input": {"op": "recall-match", "now": NOW, "products": [{"name": p} if isinstance(p, str) else p for p in products], "recall": {"title": title, "company": company}}, "note": note}


R = lambda i, title, country="DE", date="2026-10-20T00:00:00Z", company="Acme GmbH": {"id": i, "title": title, "company": company, "country": country, "date": date}


def rl(note, recalls, products=(), **kw):
    return {"input": {"op": "recall-lists", "now": NOW, "recalls": recalls, "products": [{"name": p} for p in products], **kw}, "note": note}


def cases():
    out = [
        alerts("nothing to remind of", [t("2026-10-27T08:00:00Z", 37.2), {"type": "diaper", "kind": "Wet", "t": "2026-10-27T09:00:00Z"}]),
        alerts("fever on and off for exactly 3 days", [t("2026-10-24T09:00:00Z", 38.0), t("2026-10-27T09:00:00Z", 38.4)], start="2026-10-24T08:00:00Z"),
        alerts("fever for just under 3 days", [t("2026-10-24T10:00:00Z", 38.0), t("2026-10-27T09:00:00Z", 38.4)], start="2026-10-24T08:00:00Z"),
        alerts("readings below 38 do not start the count", [t("2026-10-23T09:00:00Z", 37.9), t("2026-10-27T09:00:00Z", 38.4)], start="2026-10-23T08:00:00Z"),
        alerts("a baby under 3 months with a fever", [t("2026-10-27T09:00:00Z", 38.0)], dob="2026-08-15"),
        alerts("a baby under 3 months without fever", [t("2026-10-27T09:00:00Z", 37.5)], dob="2026-08-15"),
        alerts("no birth date", [t("2026-10-27T09:00:00Z", 38.5)], dob=None),
        alerts("40 degrees within the last day", [t("2026-10-26T12:30:00Z", 40.0)]),
        alerts("40 degrees more than a day ago", [t("2026-10-26T11:59:00Z", 40.3), t("2026-10-27T09:00:00Z", 38.1)]),
        alerts("no wet diaper for more than 8 hours counts from the last wet or both", [{"type": "diaper", "kind": "Both", "t": "2026-10-27T03:00:00Z"}, {"type": "diaper", "kind": "Poop", "t": "2026-10-27T10:00:00Z"}]),
        alerts("exactly 8 hours is not more", [{"type": "diaper", "kind": "Wet", "t": "2026-10-27T04:00:00Z"}]),
        alerts("without a wet diaper it counts from the start of the illness", [{"type": "diaper", "kind": "Dry", "t": "2026-10-27T10:00:00Z"}], start="2026-10-27T01:00:00Z"),
        alerts("no diaper logged at all: no reminder", [t("2026-10-27T09:00:00Z", 37.0)], start="2026-10-25T01:00:00Z"),
        alerts("a finished illness has no diaper reminder", [{"type": "diaper", "kind": "Dry", "t": "2026-10-27T10:00:00Z"}], start="2026-10-25T01:00:00Z", end="2026-10-27T11:00:00Z"),
        alerts("vomiting three times in 6 hours", [{"type": "vomit", "t": "2026-10-27T06:30:00Z"}, {"type": "vomit", "t": "2026-10-27T09:00:00Z"}, {"type": "vomit", "t": "2026-10-27T11:30:00Z"}]),
        alerts("the third vomit is just over 6 hours back", [{"type": "vomit", "t": "2026-10-27T05:59:00Z"}, {"type": "vomit", "t": "2026-10-27T09:00:00Z"}, {"type": "vomit", "t": "2026-10-27T11:30:00Z"}]),
        alerts("symptoms the parent noted that are worth mentioning", [{"type": "symptom", "t": "2026-10-27T08:00:00Z", "symptoms": ["Cough", "Wheezing"]}, {"type": "symptom", "t": "2026-10-27T10:00:00Z", "symptoms": ["Not drinking", "Wheezing", "Fever"]}, {"type": "symptom", "t": "2026-10-25T10:00:00Z", "symptoms": ["Fast breathing"]}]),
        alerts("everything at once, in the fixed order", [t("2026-10-24T09:00:00Z", 38.5), t("2026-10-27T09:00:00Z", 40.2), {"type": "vomit", "t": "2026-10-27T07:00:00Z"}, {"type": "vomit", "t": "2026-10-27T08:00:00Z"}, {"type": "vomit", "t": "2026-10-27T09:00:00Z"}, {"type": "symptom", "t": "2026-10-27T09:00:00Z", "symptoms": ["Very sleepy / floppy"]}, {"type": "diaper", "kind": "Wet", "t": "2026-10-26T20:00:00Z"}], start="2026-10-24T08:00:00Z", dob="2026-09-01"),
        med("the gap has passed for one medicine and not for the other; unknown medicines have no gap", [{"name": "Ibuprofen", "gapH": 6}, {"name": "Paracetamol (acetaminophen)", "gapH": 4}], [{"name": "ibuprofen", "t": "2026-10-27T05:00:00Z"}, {"name": "Paracetamol (acetaminophen)", "t": "2026-10-27T09:00:00Z"}, {"name": "Homeopathy", "t": "2026-10-27T10:00:00Z"}]),
        med("only the newest dose of a medicine counts; the gap is over exactly at the minute", [{"name": "Ibuprofen", "gapH": 6}], [{"name": "Ibuprofen", "t": "2026-10-27T01:00:00Z"}, {"name": "IBUPROFEN", "t": "2026-10-27T06:00:00Z"}]),
        med("a gap of 0 or none, or a deleted medicine, gives no gap", [{"name": "A", "gapH": 0}, {"name": "B", "gapH": None}, {"name": "C", "gapH": 4, "deleted": True}], [{"name": "A", "t": "2026-10-27T01:00:00Z"}, {"name": "B", "t": "2026-10-27T02:00:00Z"}, {"name": "C", "t": "2026-10-27T03:00:00Z"}]),
        med("half hours", [{"name": "Ibuprofen", "gapH": 0.5}], [{"name": "Ibuprofen", "t": "2026-10-27T11:30:00Z"}]),
        med("no doses", [{"name": "Ibuprofen", "gapH": 6}], []),
        backup("never backed up", ),
        backup("never backed up but the reminder is snoozed", snooze="2026-10-28T09:00:00Z"),
        backup("the snooze has run out", snooze="2026-10-27T11:00:00Z"),
        backup("a backup exactly 2 days old with newer changes is not yet stale", backed_up_at="2026-10-25T12:00:00Z", changed_at="2026-10-27T11:00:00Z"),
        backup("just over 2 days with newer changes", backed_up_at="2026-10-25T11:59:00Z", changed_at="2026-10-27T11:00:00Z"),
        backup("old backup but nothing changed since", backed_up_at="2026-10-20T00:00:00Z", changed_at="2026-10-19T00:00:00Z"),
        backup("old backup, changes never recorded", backed_up_at="2026-10-20T00:00:00Z"),
        backup("example data is never nagged", example=True),
        backup("no child yet", children=0),
        rm("every word of the product is in the title", ["Lätzchen Bébé"], "Bebe Latzchen Set", "Acme"),
        rm("a word in the company counts", ["Acme Schnuller"], "Schnuller 2-Pack", "ACME GmbH"),
        rm("one word missing: no match", ["Acme Schnuller Silikon"], "Schnuller 2-Pack", "ACME GmbH"),
        rm("words are whole words", ["Kind"], "Kinderwagen Deluxe"),
        rm("ß is ss, punctuation splits words, one-letter words are ignored", ["Fußball-Set X"], "FUSSBALL set (3 pcs)"),
        rm("the first matching product on the list is named; deleted ones are skipped", [{"name": "Schnuller", "deleted": True}, "Schnuller", "Schnuller 2"], "Schnuller 2-Pack"),
        rm("a product without words never matches", ["A", ""], "A recall"),
        rl("recalls for tracked countries only; new ones are the last 30 days not seen in the list", [R("r1", "Rattle"), R("r2", "Old", date="2026-09-20T00:00:00Z"), R("r3", "US Bottle", country="US"), R("r4", "Undated", date=None), R("r5", "Edge", date="2026-09-27T12:00:00Z"), R("r6", "Seen", date="2026-10-26T00:00:00Z")], countries=["DE"], feed_seen=["r6"]),
        rl("every country when none is chosen", [R("r1", "Rattle"), R("r3", "US Bottle", country="US"), R("r7", "No country", country="")]),
        rl("no country tracked", [R("r1", "Rattle")], countries=[]),
        rl("a recall that matches a product on the list, unless dismissed", [R("r1", "Acme Schnuller recall"), R("r2", "Schnuller Gold"), R("r3", "Rattle")], products=["Schnuller", "Bottle"], seen=["r2"]),
    ]
    return out
