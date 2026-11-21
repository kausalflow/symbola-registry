"""Behavioural properties for spikinglabs/reminders."""

import datetime as dt
import re
import unicodedata

from hypothesis import assume, given, strategies as st

from schema import Input

UTC = dt.timezone.utc
NOW = dt.datetime(2026, 10, 27, 12, 0, tzinfo=UTC)
H = dt.timedelta(hours=1)
iso = lambda t: t.strftime("%Y-%m-%dT%H:%M:%SZ")
ago = lambda hours: iso(NOW - dt.timedelta(minutes=round(hours * 60)))
hours_ago = st.floats(0, 100).map(lambda h: round(h * 4) / 4)
WORRYING = ["Fast breathing", "Very sleepy / floppy", "Not drinking", "Wheezing"]


@st.composite
def illness(draw):
    entries = []
    for _ in range(draw(st.integers(0, 10))):
        kind = draw(st.sampled_from(["temp", "diaper", "vomit", "symptom", "note"]))
        e = {"type": kind, "t": ago(draw(hours_ago))}
        if kind == "temp":
            e["tempC"] = draw(st.sampled_from([36.8, 37.9, 38.0, 38.6, 39.5, 40.0, 40.4]))
        if kind == "diaper":
            e["kind"] = draw(st.sampled_from(["Wet", "Poop", "Both", "Dry"]))
        if kind == "symptom":
            e["symptoms"] = draw(st.lists(st.sampled_from(WORRYING + ["Cough", "Rash"]), unique=True, max_size=3))
        entries.append(e)
    start = ago(draw(st.floats(1, 150)))
    dob = draw(st.sampled_from([None, "2026-09-01", "2026-08-01", "2024-01-01"]))
    end = ago(draw(st.floats(0, 1))) if draw(st.booleans()) else None
    return entries, start, end, dob


def model_alerts(entries, start, end, dob):
    out = []
    t = lambda e: dt.datetime.strptime(e["t"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=UTC)
    temps = [e for e in entries if e["type"] == "temp"]
    fevers = [t(e) for e in temps if e["tempC"] >= 38.0]
    if fevers and max(fevers) - min(fevers) >= dt.timedelta(days=3):
        out.append({"kind": "fever-3-days"})
    if fevers and dob and (NOW - dt.datetime.fromisoformat(dob).replace(tzinfo=UTC)).total_seconds() / 86400 / 30.44 < 3:
        out.append({"kind": "under-3-months"})
    if any(e["tempC"] >= 40 and NOW - t(e) < 24 * H for e in temps):
        out.append({"kind": "very-high-temp"})
    if not end and any(e["type"] == "diaper" for e in entries):
        wet = [t(e) for e in entries if e["type"] == "diaper" and e["kind"] in ("Wet", "Both")]
        last = max(wet) if wet else dt.datetime.strptime(start, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=UTC)
        if NOW - last > 8 * H:
            out.append({"kind": "no-wet-diaper"})
    if sum(1 for e in entries if e["type"] == "vomit" and NOW - t(e) < 6 * H) >= 3:
        out.append({"kind": "vomiting"})
    seen = []
    for e in sorted((e for e in entries if e["type"] == "symptom" and NOW - t(e) < 24 * H), key=t, reverse=True):
        seen += [s.lower() for s in e["symptoms"] if s in WORRYING and s.lower() not in seen]
    if seen:
        out.append({"kind": "worrying-symptoms", "symptoms": seen})
    return out


def test_the_sick_mode_reminders_follow_the_rules(impl):
    @given(illness())
    def check(ill):
        entries, start, end, dob = ill
        # symptoms are listed newest entry first; keep the times of symptom entries apart so the order is defined
        ts = [e["t"] for e in entries if e["type"] == "symptom"]
        assume(len(ts) == len(set(ts)))
        got = impl(Input(op="alerts", now=iso(NOW), child={"dob": dob}, episode={"start": start, **({"end": end} if end else {})}, entries=entries)).alerts
        assert got == model_alerts(entries, start, end, dob)

    check()


def test_a_medicine_gap_is_passed_when_the_last_dose_is_old_enough(impl):
    @given(st.lists(st.tuples(st.sampled_from(["Ibuprofen", "ibuprofen", "Paracetamol", "Other"]), st.integers(0, 40)), min_size=1, max_size=6), st.sampled_from([None, 0, 4, 6, 0.5]))
    def check(doses, gap):
        entries = [{"type": "med", "name": n, "t": ago(h / 2)} for n, h in doses]
        meds = [{"name": "Ibuprofen", "gapH": gap}, {"name": "Paracetamol", "gapH": 4}]
        assume(len({e["t"] for e in entries}) == len(entries))
        got = impl(Input(op="medicine", now=iso(NOW), meds=meds, entries=entries)).medicines
        by = {}
        for e in sorted(entries, key=lambda e: e["t"], reverse=True):
            by.setdefault(e["name"].lower(), e)
        assert [m["name"] for m in got] == [e["name"] for e in by.values()]
        for m, e in zip(got, by.values()):
            g = {"ibuprofen": gap, "paracetamol": 4}.get(e["name"].lower())
            if not g:
                assert m["gap"] == "none" and m["gap_hours"] is None
            else:
                last = dt.datetime.strptime(e["t"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=UTC)
                assert m["gap"] == ("passed" if last + g * H <= NOW else "waiting") and m["gap_hours"] == g

    check()


def test_the_backup_reminder_follows_the_rules(impl):
    @given(st.booleans(), st.integers(0, 2), st.one_of(st.none(), hours_ago), st.one_of(st.none(), hours_ago), st.one_of(st.none(), st.floats(-10, 10)))
    def check(example, children, backed_up, changed, snooze):
        state = {"example": example, "children": children}
        if backed_up is not None:
            state["backed_up_at"] = ago(backed_up)
        if changed is not None:
            state["changed_at"] = ago(changed)
        if snooze is not None:
            state["snooze"] = iso(NOW + round(snooze * 4) / 4 * H)
        got = impl(Input(op="backup", now=iso(NOW), state=state)).due
        if example or not children or (snooze is not None and round(snooze * 4) / 4 > 0):
            want = None
        elif backed_up is None:
            want = "never"
        else:
            want = "stale" if changed is not None and changed < backed_up and backed_up > 48 else None
        assert got == want

    check()


WORDS = st.lists(st.sampled_from(["Schnuller", "Bébé", "Latzchen", "Fußball", "Set", "x", "2-Pack", "Acme", "Baby", "Löffel"]), min_size=1, max_size=3)


def words(text):
    text = unicodedata.normalize("NFKD", text.lower())
    text = "".join(c for c in text if not 0x300 <= ord(c) <= 0x36F).replace("ß", "ss")
    return {w for w in re.split(r"[^\w]+|_", text) if len(w) > 1}


def test_a_product_matches_a_recall_when_all_its_words_are_in_it(impl):
    @given(WORDS, WORDS, WORDS)
    def check(prod, title, company):
        got = impl(Input(op="recall-match", now=iso(NOW), products=[{"name": " ".join(prod)}], recall={"title": " ".join(title), "company": " ".join(company)})).matched
        pw = words(" ".join(prod))
        want = " ".join(prod) if pw and pw <= words(" ".join(title + company)) else None
        assert got == want

    check()


def test_recall_lists_follow_the_rules(impl):
    @given(
        st.lists(st.tuples(st.sampled_from(["DE", "US", "FR", ""]), st.one_of(st.none(), st.integers(0, 60)), st.sampled_from(["Schnuller Gold", "Rattle", "Baby Löffel"])), min_size=1, max_size=6),
        st.one_of(st.none(), st.lists(st.sampled_from(["DE", "US", "FR"]), unique=True, max_size=3)),
        st.lists(st.integers(0, 5), unique=True, max_size=3),
        st.lists(st.integers(0, 5), unique=True, max_size=3),
    )
    def check(rows, countries, seen, feed_seen):
        recalls = [{"id": f"r{i}", "title": title, "company": "Acme", "country": c, **({"date": ago(24 * d)} if d is not None else {})} for i, (c, d, title) in enumerate(rows)]
        got = impl(Input(op="recall-lists", now=iso(NOW), recalls=recalls, products=[{"name": "Schnuller"}, {"name": "Loeffel"}], countries=countries,
                         seen=[f"r{i}" for i in seen], feed_seen=[f"r{i}" for i in feed_seen]))
        tracked = [r for r in recalls if countries is None or r["country"] in countries]
        assert got.new == [r["id"] for r in tracked if "date" in r and int(r["id"][1:]) not in feed_seen and rows[int(r["id"][1:])][1] <= 30]
        assert got.alerts == [r["id"] for r in tracked if int(r["id"][1:]) not in seen and words("Schnuller") <= words(r["title"] + " Acme")]

    check()
