"""Behavioural properties for spikinglabs/backup-retention."""

import datetime as dt
import re

from hypothesis import assume, given, strategies as st

from schema import Input

HOURLY = re.compile(r"^aura-backup-\d{4}-\d\d-\d\d(-\d\d)?\.json$")


@st.composite
def folders(draw):
    n = draw(st.integers(0, 130))
    start = dt.datetime(2026, 10, 27, 9) - dt.timedelta(hours=draw(st.integers(0, 5)))
    step = draw(st.sampled_from([1, 1, 3, 7, 20]))
    names = {f"aura-backup-{(start - dt.timedelta(hours=i * step)).strftime('%Y-%m-%d-%H')}.json" for i in range(n)}
    if draw(st.booleans()):
        names.add("aura-backup-2026-01-05.json")
    return sorted(names, reverse=True)


def model_prune(files):
    delete, days = [], set()
    for i, name in enumerate(files):
        if i < 48:
            continue
        d = name[12:22]
        if d in days or len(days) >= 60:
            delete.append(name)
        else:
            days.add(d)
    return delete


def test_the_newest_48_and_a_copy_a_day_are_kept(impl):
    @given(folders())
    def check(files):
        got = impl(Input(op="prune", files=files)).delete
        assert got == model_prune(files)
        assert set(files[:48]).isdisjoint(got)

    check()


def test_pruning_never_removes_a_days_only_older_copy_within_60_days(impl):
    @given(folders())
    def check(files):
        gone = set(impl(Input(op="prune", files=files)).delete)
        left = [f for f in files if f not in gone]
        older = {f[12:22] for f in files[48:]}
        for day in list(sorted(older, reverse=True))[:60]:
            assert any(f[12:22] == day for f in left), day

    check()


OTHER = st.lists(st.sampled_from(["aura-log-before-v3.json", "aura-log-before-v2.json", "notes.txt", "aura-backup-x.json"]), unique=True, max_size=3)


def test_one_copy_an_hour_and_only_hourly_copies_are_pruned(impl):
    @given(folders(), OTHER, st.integers(0, 3), st.booleans(), st.booleans())
    def check(files, others, hour_offset, exists, done):
        now = dt.datetime(2026, 10, 27, 10, 17) + dt.timedelta(hours=hour_offset)
        hour = now.strftime("%Y-%m-%d-%H")
        name = f"aura-backup-{hour}.json"
        listing = sorted(set(files + others + ([name] if exists else [])), reverse=True)
        out = impl(Input(op="snapshot", now=now.strftime("%Y-%m-%dT%H:%M:%S"), files=listing, done_hour=hour if done else None))
        if done:
            assert out.upload is None and out.delete == []
            return
        assert out.upload == (None if exists else name)
        hourly = [f for f in listing if HOURLY.match(f) and f != name]
        assert out.delete == model_prune(hourly)
        assert not set(out.delete) & set(others)

    check()


def test_the_phone_keeps_14_daily_copies(impl):
    @given(st.lists(st.integers(0, 40), unique=True, max_size=30), st.booleans(), st.booleans())
    def check(ages, today_exists, example):
        today = dt.date(2026, 10, 27)
        snaps = [f"snap-{(today - dt.timedelta(days=a)).isoformat()}" for a in ages if a > 0]
        keys = ["state", "before-v3"] + snaps + ([f"snap-{today.isoformat()}"] if today_exists else [])
        out = impl(Input(op="daily-copy", now="2026-10-27T10:30:00", keys=keys, example=example))
        if example:
            assert out.put is None and out.delete == []
            return
        assert out.put == (None if today_exists else f"snap-{today.isoformat()}")
        assert out.delete == sorted(snaps, reverse=True)[13:]

    check()
