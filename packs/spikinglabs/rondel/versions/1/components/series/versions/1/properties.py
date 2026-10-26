"""Behavioural properties for spikinglabs/series, checked against Python's own calendar and hashing."""

import base64
import datetime as dt
import hashlib

from hypothesis import given, strategies as st

from schema import Input

DATES = st.dates(min_value=dt.date(1990, 1, 1), max_value=dt.date(2060, 12, 31))
CADENCES = ["daily", "weekly", "biweekly", "monthly"]


def period_of(cadence, d):
    if cadence == "daily":
        return d.isoformat()
    if cadence == "monthly":
        return f"{d.year}-{d.month:02d}"
    y, w, _ = d.isocalendar()
    return f"{y}-W{w:02d}"


def call(impl, **kw):
    return impl(Input(**kw)).result


def test_period_is_the_calendar_period_of_the_date(impl):
    @given(DATES, st.sampled_from(CADENCES + ["none"]))
    def check(d, cadence):
        want = "all" if cadence == "none" else period_of(cadence, d)
        assert call(impl, op="period", cadence=cadence, date=d.isoformat()) == want

    check()


def test_the_next_period_is_the_period_one_step_later(impl):
    @given(DATES, st.sampled_from(CADENCES))
    def check(d, cadence):
        here = period_of(cadence, d)
        if cadence == "daily":
            later = d + dt.timedelta(days=1)
        elif cadence == "monthly":
            later = dt.date(d.year + (d.month == 12), d.month % 12 + 1, 1)
        else:
            later = d + dt.timedelta(days=7)
        assert call(impl, op="next_period", cadence=cadence, occ=here) == period_of(cadence, later)

    check()


def test_a_meeting_name_leads_back_to_its_period(impl):
    @given(DATES, st.sampled_from(CADENCES), st.integers(1, 12))
    def check(d, cadence, n):
        period = period_of(cadence, d)
        name = period if n == 1 else f"{period}-{n}"
        assert call(impl, op="base_period", cadence=cadence, occ=name) == period
        assert call(impl, op="next_period", cadence=cadence, occ=name) == call(impl, op="next_period", cadence=cadence, occ=period)

    check()


def test_decide_follows_the_walk_through_the_periods_names(impl):
    @given(st.lists(st.sampled_from(["none", "live", "closed", "deleted"]), min_size=0, max_size=5), st.sampled_from(["2026-W42", "2026-10", "2026-10-15"]))
    def check(statuses, period):
        names = [period] + [f"{period}-{i}" for i in range(2, 7)]
        occurrences = {names[i]: {"status": s} for i, s in enumerate(statuses) if s != "none"}
        n = 0
        while n < len(names) and occurrences.get(names[n], {}).get("status") in ("closed", "deleted"):
            n += 1
        occ = names[n]
        got = call(impl, op="decide", period=period, occurrences=occurrences)
        if occ in occurrences:
            assert got == {"kind": "open", "occ": occ}
        elif n == 0:
            assert got == {"kind": "create", "occ": occ, "n": 1}
        else:
            assert got == {"kind": "closed", "last": names[n - 1], "next": occ, "n": n + 1, "deleted": occurrences[names[n - 1]]["status"] == "deleted"}

    check()


def test_room_and_key_are_truncated_sha256_of_the_series_key_and_meeting(impl):
    @given(st.text(min_size=1, max_size=40), st.text(min_size=1, max_size=20))
    def check(key, occ):
        def digest(kind, n):
            raw = hashlib.sha256(f"rondel-series-{kind}:{key}:{occ}".encode()).digest()[:n]
            return base64.urlsafe_b64encode(raw).decode().rstrip("=")

        assert call(impl, op="room", series_key=key, occ=occ) == {"roomId": digest("room", 12), "key": digest("key", 18)}

    check()


def test_calendar_text_is_well_formed_and_unfolds_to_the_escaped_lines(impl):
    name = st.text(alphabet=st.sampled_from(list("abcXYZ ;,\\\néü€😀-")), min_size=1, max_size=120)

    @given(name, st.integers(0, 600), st.sampled_from(CADENCES + ["none"]), st.text(alphabet="abcdef-_/:.#0123456789", min_size=1, max_size=150))
    def check(summary, minutes, cadence, link):
        info = {"name": summary, "cadence": cadence, "start": "2026-10-05T09:30", "durationMin": minutes, "template": {"agenda": []}}
        text = call(impl, op="ics", id="sid", info=info, link=link, now="2026-10-17T12:00:00.000Z")
        assert text.endswith("\r\n") and "\n" not in text.replace("\r\n", "")
        physical = text[:-2].split("\r\n")
        assert all(len(line.encode()) <= 75 for line in physical)
        lines = []
        for line in physical:
            if line.startswith(" "):
                lines[-1] += line[1:]
            else:
                lines.append(line)
        esc = lambda s: s.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\r\n", "\\n").replace("\n", "\\n")
        assert f"SUMMARY:{esc(summary)}" in lines
        assert f"LOCATION:{esc(link)}" in lines and f"URL:{link}" in lines
        assert f"DURATION:PT{max(5, minutes)}M" in lines and "DTSTART:20261005T093000" in lines
        assert any(line.startswith("RRULE:") for line in lines) == (cadence != "none")
        assert lines[0] == "BEGIN:VCALENDAR" and lines[-1] == "END:VCALENDAR"

    check()


def test_a_deleted_meeting_stays_deleted(impl):
    @given(st.sampled_from(["live", "closed"]), st.sampled_from(["live", "closed", "deleted"]))
    def check(before, after):
        info = {"name": "S", "template": {"agenda": []}}
        steps = [
            {"op": "add_occurrence", "args": {"occurrence": {"occ": "2026-W42", "title": "T", "status": before, "createdAt": "2026-10-12T10:00:00.000Z", "closedAt": None}}},
            {"op": "mark_deleted", "args": {"occ": "2026-W42"}},
            {"op": "sync_occurrence", "args": {"occ": "2026-W42", "title": "Changed", "status": after, "closedAt": None, "createdAt": "2026-10-12T10:00:00.000Z"}},
        ]
        got = call(impl, op="document", info=info, steps=steps)["occurrences"]["2026-W42"]
        assert got["status"] == "deleted" and got["title"] == "T"

    check()
