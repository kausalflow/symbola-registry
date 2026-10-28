"""Behavioural properties for spikinglabs/schedule."""

import datetime as dt

from hypothesis import assume, given, strategies as st

from schema import Input

UTC = dt.timezone.utc
NOW = dt.datetime(2026, 10, 27, 10, 0, tzinfo=UTC)
DAY = dt.timedelta(days=1)

# plan tables as in the contract: key -> (usual period, window), a period is (from, to, unit)
U = {"U1": ((1, 1, "d"), (1, 1, "d")), "U2": ((3, 10, "d"), (3, 14, "d")), "U3": ((4, 5, "w"), (3, 8, "w")), "U4": ((3, 4, "m"), (2, 4.5, "m")),
     "U5": ((6, 7, "m"), (5, 8, "m")), "U6": ((10, 12, "m"), (9, 14, "m")), "U7": ((21, 24, "m"), (20, 27, "m")), "U7a": ((34, 36, "m"), (33, 38, "m")),
     "U8": ((46, 48, "m"), (43, 50, "m")), "U9": ((60, 64, "m"), (58, 66, "m")), "U10": ((10, 11, "y"), (10, 11, "y")), "J1": ((13, 14, "y"), (13, 15, "y"))}
Z = {f"Z{i + 1}": (p, p) for i, p in enumerate([(6, 9, "m"), (10, 20, "m"), (21, 33, "m"), (34, 48, "m"), (49, 60, "m"), (61, 72, "m")])}
VAX = {"rsv": ([0], 12, 12), "rota": ([1.5, 2], None, 8), "6in1": ([2, 4, 11], None, None), "pcv": ([2, 4, 11], None, None), "menb": ([2, 4, 12], None, None),
       "mmr": ([11, 15], None, None), "var": ([11, 15], None, None), "tdap": ([60], 84, None), "tdapipv": ([108], 204, None), "hpv": ([108, 113], 180, None), "menacwy": ([144], 180, None)}


def add_months(d, n):
    y, m = divmod(d.year * 12 + d.month - 1 + n, 12)
    return dt.date(y, m + 1, d.day)


def life(dob, n, unit, end):
    k = n if end else n - 1
    if unit == "d":
        return dob + dt.timedelta(days=k)
    if unit == "w":
        return dob + dt.timedelta(days=7 * k)
    k = k * (12 if unit == "y" else 1)
    if k % 1:
        return (dt.datetime(dob.year, dob.month, dob.day, 12) + dt.timedelta(days=k * 30.44)).date()
    return add_months(dob, int(k))


def midnight(d):
    return dt.datetime(d.year, d.month, d.day, tzinfo=UTC)


def iso(t):
    return t.strftime("%Y-%m-%dT%H:%M:%SZ")


dobs = st.dates(dt.date(2008, 1, 1), dt.date(2026, 10, 27)).filter(lambda d: d.day <= 28)
nows = st.datetimes(dt.datetime(2026, 1, 1), dt.datetime(2028, 1, 1)).map(lambda t: t.replace(tzinfo=UTC, microsecond=0))
ymd = lambda d: d.isoformat()


def status(impl, plan, dob, now=NOW, **kw):
    child = {"dob": ymd(dob) if dob else None, **({"vax_skip": kw.pop("skip")} if "skip" in kw else {})}
    return impl(Input(op="status", plan=plan, now=iso(now), child=child, **kw))


def test_checkup_periods_follow_the_tables(impl):
    @given(st.sampled_from(["u", "z"]), dobs)
    def check(plan, dob):
        table = U if plan == "u" else Z
        out = status(impl, plan, dob)
        assert [i["k"] for i in out.items] == list(table)
        for i in out.items:
            (ua, ub, uu), (wa, wb, wu) = table[i["k"]]
            assert i["usual_from"] == ymd(life(dob, ua, uu, False)) and i["usual_to"] == ymd(life(dob, ub, uu, True))
            assert i["window_from"] == ymd(life(dob, wa, wu, False)) and i["window_to"] == ymd(life(dob, wb, wu, True))

    check()


def test_checkup_status_follows_the_window(impl):
    @given(st.sampled_from(["u", "z"]), dobs, nows)
    def check(plan, dob, now):
        out = status(impl, plan, dob, now)
        for i in out.items:
            ws, we = midnight(dt.date.fromisoformat(i["window_from"])), midnight(dt.date.fromisoformat(i["window_to"]))
            want = "missed" if now >= we else "due" if now >= ws else "soon" if now >= ws - 28 * DAY else "later"
            assert i["status"] == want, (i["k"], now)
        assert out.open == [i["k"] for i in out.items if i["status"] in ("due", "soon")]

    check()


def test_a_recorded_checkup_is_done_whatever_else_is_known(impl):
    @given(st.sampled_from(["u", "z"]), dobs, st.integers(0, 11), st.booleans())
    def check(plan, dob, which, booked):
        table = U if plan == "u" else Z
        k = list(table)[which % len(table)]
        rec = {"exams": [{"u": k, "date": "2026-09-01"}]} if plan == "u" else {"visits": [{"z": k, "date": "2026-09-01"}]}
        appts = [{"plan": plan, "k": k, "date": "2027-02-01", "time": ""}] if booked else []
        out = status(impl, plan, dob, appts=appts, **rec)
        item = next(i for i in out.items if i["k"] == k)
        assert item["status"] == "done" and k not in out.open
        # deleted records do not count
        gone = {key: [{**r, "deleted": True} for r in v] for key, v in rec.items()}
        assert next(i for i in status(impl, plan, dob, **gone).items if i["k"] == k)["status"] != "done"

    check()


def test_an_appointment_replaces_the_usual_time_until_its_day_has_passed(impl):
    @given(st.sampled_from(["u", "z"]), dobs, st.integers(-5, 40), st.sampled_from(["", "07:30", "23:00"]), st.sampled_from(list(U)[:9]))
    def check(plan, dob, offset, time, k):
        if plan == "z":
            k = "Z" + str(1 + list(U).index(k) % 6)
        day = (NOW + dt.timedelta(days=offset)).date()
        out = status(impl, plan, dob, appts=[{"plan": plan, "k": k, "date": ymd(day), "time": time}])
        item = next(i for i in out.items if i["k"] == k)
        assert item["status"] == ("went" if day < NOW.date() else "booked") and item["appointment"] == ymd(day)
        soon = item["status"] == "went" or day < NOW.date() + 15 * DAY
        assert (k in out.open) == soon

    check()


def due_months(k, n):
    return VAX[k][0][n]


def test_vaccine_status_follows_the_age_and_the_doses(impl):
    @given(dobs, nows, st.lists(st.integers(0, 3), min_size=len(VAX), max_size=len(VAX)))
    def check(dob, now, counts):
        counts = dict(zip(VAX, counts))
        doses = [{"against": [k], "date": "2026-01-01"} for k, c in counts.items() for _ in range(c)]
        out = status(impl, "vax", dob, now, doses=doses)
        m = (now - midnight(dob)).total_seconds() / 86400 / 30.44
        assert [i["k"] for i in out.items] == list(VAX)
        for i in out.items:
            at, upto, until = VAX[i["k"]]
            n = counts[i["k"]]
            assert i["doses"] == n and i["of"] == len(at)
            if n >= len(at):
                want = "done"
            else:
                due = at[n]
                want = "missed" if until is not None and m > until else "late" if m > (upto if upto is not None else due + 2) else "due" if m >= due - 0.5 else "later"
                if want in ("later", "due", "late"):
                    base = dt.datetime(dob.year, dob.month, dob.day, 12)
                    when = (base + dt.timedelta(days=due * 30.44)).date() if due % 1 else add_months(dob, int(due))
                    assert i["usual_from"] == ymd(when)
            assert i["status"] == want, (i["k"], n, m)
        assert out.open == [i["k"] for i in out.items if i["status"] in ("due", "late")]

    check()


def test_skipped_vaccines_are_skipped_and_nothing_is_due_without_a_birth_date(impl):
    @given(st.lists(st.sampled_from(list(VAX)), unique=True, max_size=4))
    def check(skip):
        out = status(impl, "vax", None, skip=skip)
        assert {i["k"]: i["status"] for i in out.items} == {k: ("skip" if k in skip else "open") for k in VAX} and out.open == []
        out = status(impl, "vax", dt.date(2026, 6, 1), skip=skip, doses=[{"against": [k], "date": "2026-07-01"} for k in skip])
        assert all(i["status"] == "skip" for i in out.items if i["k"] in skip)

    check()


def test_a_schedule_turned_off_points_nothing_out(impl):
    @given(st.sampled_from(["vax", "u", "z"]), dobs)
    def check(plan, dob):
        on = status(impl, plan, dob)
        off = status(impl, plan, dob, **{f"{plan if plan != 'vax' else 'vax'}_plan": "none"})
        assert off.open == [] and [i["status"] for i in off.items] == [i["status"] for i in on.items]

    check()


def test_calendar_dates_are_unique_sorted_and_within_a_year(impl):
    @given(dobs, nows)
    def check(dob, now):
        out = impl(Input(op="events", now=iso(now), child={"dob": ymd(dob)}))
        uids = [e["uid"] for e in out.events]
        assert len(uids) == len(set(uids))
        keys = [(e["date"], e["time"] or "00:00") for e in out.events]
        assert keys == sorted(keys)
        for e in out.events:
            assert now.date().isoformat() <= e["date"] and midnight(dt.date.fromisoformat(e["date"])) < now + 365 * DAY
            assert e["booked"] is False and e["time"] == ""

    check()


def test_calendar_dates_match_the_statuses(impl):
    @given(dobs, nows)
    def check(dob, now):
        events = {e["uid"]: e for e in impl(Input(op="events", now=iso(now), child={"dob": ymd(dob)})).events}
        today = now.date()
        for plan, first in (("u", "usual_from"), ("z", "window_from")):
            for i in status(impl, plan, dob, now).items:
                uid = f"c1-{i['k']}"
                if i["status"] in ("due", "soon", "later"):
                    when = max(today, dt.date.fromisoformat(i[first]))
                    if midnight(when) < now + 365 * DAY:
                        assert events[uid]["date"] == ymd(when), uid
                else:
                    assert uid not in events
        for i in status(impl, "vax", dob, now).items:
            if i["status"] in ("due", "late", "later"):
                uid = f"c1-vax-{i['k']}-{i['doses'] + 1}"
                when = max(today, dt.date.fromisoformat(i["usual_from"]))
                if midnight(when) < now + 365 * DAY:
                    assert events[uid]["date"] == ymd(when), uid
            else:
                assert not any(u.startswith(f"c1-vax-{i['k']}-") for u in events)

    check()


def test_a_booked_appointment_goes_into_the_calendar_with_its_time(impl):
    @given(dobs, st.integers(0, 30), st.sampled_from(["", "09:15", "16:40"]), st.sampled_from(list(U)))
    def check(dob, offset, time, k):
        day = (NOW + dt.timedelta(days=offset)).date()
        out = impl(Input(op="events", now=iso(NOW), child={"dob": ymd(dob)}, appts=[{"plan": "u", "k": k, "date": ymd(day), "time": time}]))
        e = next((e for e in out.events if e["uid"] == f"c1-{k}"), None)
        assert e == {"uid": f"c1-{k}", "date": ymd(day), "time": time, "booked": True}

    check()
