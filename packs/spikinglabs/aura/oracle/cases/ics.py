"""Cases for the ics component."""

NOW = "2026-10-27T10:05:09Z"
HREF = "https://example.org/aura/?x=1#y"


def call(note, *events):
    return {"input": {"now": NOW, "href": HREF, "events": list(events)}, "note": note}


def ev(uid="c1-U4", at="2026-11-03T00:00", title="U4 checkup · Mia", details="Usually month 3 to 4.", **kw):
    return {"uid": uid, "at": at, "title": title, "details": details, **kw}


def cases():
    return [
        call("one all-day event: a day to the next, a reminder at 9:00", ev()),
        call("a booked appointment with a time: one hour, opaque, URL, reminders the day and an hour before", ev("x1", "2026-11-04T09:30", "🩺 Z1 dental checkup · Mia", "Bring: U-Heft", time="09:30", booked=True, location="Dr. Zahn, Hauptstr. 1")),
        call("a booked appointment without a time is an all-day event with the URL and transparent", ev("x2", "2026-11-05T12:00", "📅 Hip ultrasound · Mia", "d", booked=True)),
        call("a timed event across midnight", ev("x3", "2026-12-31T23:30", "Late", "d", time="23:30")),
        call("a day at the end of the month and year", ev("x4", "2026-12-31T00:00", "New year", "d")),
        call("several events: one file, a general name", ev("a", "2026-11-03T00:00", "U4 checkup · Mia"), ev("b", "2026-11-10T00:00", "MMR vaccination · Mia")),
        call("commas, semicolons, line breaks and backslashes in text", ev("e", "2026-11-03T00:00", "A, B; C", "one, two; three\nfour\r\nfive \\ six", location="Hall 3; Room, 4")),
        call("a long line is folded at 75 octets", ev("f", "2026-11-03T00:00", "Long", "Aaaa bbbb cccc dddd eeee ffff gggg hhhh iiii jjjj kkkk llll mmmm nnnn oooo pppp qqqq rrrr ssss tttt uuuu vvvv wwww xxxx yyyy zzzz")),
        call("folding with multi-byte characters: counted in octets, a character is never split", ev("g", "2026-11-03T00:00", "Äö", "ä" * 80 + " 🦷" * 30)),
        call("a SUMMARY line of exactly 75 octets is not folded; the reminder line with the same title is", ev("h", "2026-11-03T00:00", "T" * 67, "d")),
        call("filename: spaces, digits, accents and emoji in the title", ev("i", "2026-11-03T00:00", "💉 Vaccination: 6-in-1, Pneumococcus · Mia")),
        call("filename without a ' ·' keeps the whole title", ev("j", "2026-11-03T00:00", "Ärztin: Dr. Müller!")),
        call("google link encoding of spaces, commas, umlauts, newlines and &", ev("k", "2026-11-03T00:00", "Hip & knee · Mia", "line1\nline2, über #1 = 100%", location="Café Zoë")),
        call("google link for a timed event without a location", ev("l", "2026-11-04T09:30", "Timed", "d", time="09:30")),
        call("no events", ),
    ]
