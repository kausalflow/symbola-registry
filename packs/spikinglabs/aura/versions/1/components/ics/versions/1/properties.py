"""Behavioural properties for spikinglabs/ics."""

import datetime as dt
import re
from urllib.parse import parse_qsl, urlsplit

from hypothesis import given, strategies as st

from schema import Input

NOW = "2026-10-27T10:05:09Z"
HREF = "https://example.org/aura/?x=1#y"
TEXT = st.text(alphabet=st.sampled_from(list("abc XYZ,;\n.:äö€🦷-1")), max_size=120)
TITLE = st.text(alphabet=st.sampled_from(list("abc XYZ,;äö€🩺-1·")), min_size=1, max_size=40)


@st.composite
def events(draw, n=None):
    out = []
    for i in range(n or draw(st.integers(0, 4))):
        timed = draw(st.booleans())
        day = dt.datetime(2026, 11, 1) + dt.timedelta(days=draw(st.integers(0, 400)), hours=draw(st.integers(0, 23)), minutes=draw(st.integers(0, 59)))
        out.append({"uid": f"c1-e{i}", "at": day.strftime("%Y-%m-%dT%H:%M"), "time": day.strftime("%H:%M") if timed else "", "title": draw(TITLE), "details": draw(TEXT),
                    **({"location": draw(TEXT)} if draw(st.booleans()) else {}), "booked": draw(st.booleans())})
    return out


def make(impl, evs):
    return impl(Input(now=NOW, href=HREF, events=evs))


def unfold(ics):
    return ics.replace("\r\n ", "")


def esc(s):
    return s.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def test_the_file_has_the_stated_shape(impl):
    @given(events())
    def check(evs):
        ics = make(impl, evs).ics
        assert ics.endswith("\r\n") and "\n" not in ics.replace("\r\n", "")
        for line in ics.split("\r\n")[:-1]:
            assert len(line.encode()) <= 75, "a line is longer than 75 octets"
        lines = unfold(ics).split("\r\n")[:-1]
        assert lines[:5] == ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Aura//Baby log//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"] and lines[-1] == "END:VCALENDAR"
        assert lines.count("BEGIN:VEVENT") == len(evs) == lines.count("END:VEVENT")

    check()


def test_each_event_is_written_as_stated(impl):
    @given(events(n=1))
    def check(evs):
        e = evs[0]
        lines = unfold(make(impl, evs).ics).split("\r\n")[5:-2]
        start = dt.datetime.strptime(e["at"], "%Y-%m-%dT%H:%M")
        if e["time"]:
            s, f = start.strftime("%Y%m%dT%H%M00"), (start + dt.timedelta(hours=1)).strftime("%Y%m%dT%H%M00")
            dates = [f"DTSTART:{s}", f"DTEND:{f}"]
            alarms = ["-P1D", "-PT1H"]
        else:
            day = start.replace(hour=0, minute=0)
            dates = [f"DTSTART;VALUE=DATE:{day:%Y%m%d}", f"DTEND;VALUE=DATE:{day + dt.timedelta(days=1):%Y%m%d}"]
            alarms = ["PT9H"]
        want = ["BEGIN:VEVENT", f"UID:{e['uid']}@aura", "DTSTAMP:20261027T100509Z", *dates, f"SUMMARY:{esc(e['title'])}", f"DESCRIPTION:{esc(e['details'])}"]
        if e.get("location"):
            want.append(f"LOCATION:{esc(e['location'])}")
        if e["booked"]:
            want.append("URL:https://example.org/aura/?open=appts")
        want.append("TRANSP:OPAQUE" if e["booked"] and e["time"] else "TRANSP:TRANSPARENT")
        for t in alarms:
            want += ["BEGIN:VALARM", "ACTION:DISPLAY", f"DESCRIPTION:{esc(e['title'])}", f"TRIGGER:{t}", "END:VALARM"]
        want.append("END:VEVENT")
        assert lines == want

    check()


def test_the_file_name_and_the_google_link(impl):
    @given(events(n=1))
    def check(evs):
        e = evs[0]
        out = make(impl, evs)
        assert out.filename == "aura-" + re.sub(r"[^a-z0-9]+", "-", e["title"].split(" ·")[0].lower()) + ".ics"
        url = urlsplit(out.google_url)
        assert url.scheme == "https" and url.netloc == "calendar.google.com" and url.path == "/calendar/render"
        q = parse_qsl(url.query, keep_blank_values=True)
        start = dt.datetime.strptime(e["at"], "%Y-%m-%dT%H:%M")
        want_dates = f"{start:%Y%m%dT%H%M00}/{start + dt.timedelta(hours=1):%Y%m%dT%H%M00}" if e["time"] else f"{start:%Y%m%d}/{start.replace(hour=0, minute=0) + dt.timedelta(days=1):%Y%m%d}"
        assert [k for k, _ in q] == ["action", "text", "dates", "details"] + (["location"] if e.get("location") else [])
        assert dict(q)["text"] == e["title"] and dict(q)["dates"] == want_dates and dict(q)["details"] == e["details"] and dict(q)["action"] == "TEMPLATE"

    check()


def test_several_events_have_a_general_name_and_no_link(impl):
    @given(events().filter(lambda e: len(e) != 1))
    def check(evs):
        out = make(impl, evs)
        assert out.filename == "aura-dates.ics" and out.google_url is None

    check()
