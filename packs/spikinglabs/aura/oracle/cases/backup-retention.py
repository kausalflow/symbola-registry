"""Cases for the backup-retention component."""
import datetime as dt

END = dt.datetime(2026, 10, 27, 9)


def hourly(n, step=1, end=END):
    return [f"aura-backup-{(end - dt.timedelta(hours=i * step)).strftime('%Y-%m-%d-%H')}.json" for i in range(n)]


def prune(note, files):
    return {"input": {"op": "prune", "files": files}, "note": note}


def snap(note, files, now="2026-10-27T10:30:00", done=None):
    return {"input": {"op": "snapshot", "now": now, "files": files, "done_hour": done}, "note": note}


def daily(note, keys, now="2026-10-27T10:30:00", example=False):
    return {"input": {"op": "daily-copy", "now": now, "keys": keys, **({"example": True} if example else {})}, "note": note}


def cases():
    days = [f"aura-backup-{(dt.date(2026, 10, 27) - dt.timedelta(days=i)).isoformat()}-{h:02d}.json" for i in range(80) for h in (18, 6)]
    return [
        prune("fewer than 48 copies: nothing to delete", hourly(30)),
        prune("exactly 48 copies", hourly(48)),
        prune("older copies: the newest of each day stays (60 hours, hourly)", hourly(60)),
        prune("a day that also has copies among the newest 48 keeps one more", hourly(52, end=dt.datetime(2026, 10, 27, 3))),
        prune("two copies a day for 80 days: the 48 newest, then one a day for 60 days, the rest goes", days),
        prune("the old copies without an hour count as hourly copies", ["aura-backup-2026-10-27-09.json"] + hourly(50, 1, dt.datetime(2026, 9, 1, 8)) + ["aura-backup-2026-08-01.json", "aura-backup-2026-07-30.json"]),
        prune("no files", []),
        snap("a first snapshot of the hour is saved", ["aura-backup-2026-10-27-09.json", "aura-backup-2026-10-27-08.json"]),
        snap("a second write within the same hour does nothing", ["aura-backup-2026-10-27-09.json"], done="2026-10-27-10"),
        snap("the hour's copy already exists (another phone made it): not saved again, but pruning goes on", hourly(52, end=dt.datetime(2026, 10, 27, 10)) , now="2026-10-27T10:05:00"),
        snap("pruning counts the folder's hourly copies only; before-upgrade copies and other files are left alone", ["aura-log-before-v3.json", "notes.txt"] + hourly(55, 1, dt.datetime(2026, 10, 27, 9))),
        snap("an empty folder", []),
        snap("midnight: the hour belongs to the new day", ["aura-backup-2026-10-26-23.json"], now="2026-10-27T00:00:00"),
        daily("the first copy of the day", ["state", "snap-2026-10-26", "snap-2026-10-25"]),
        daily("today's copy exists", ["state", "snap-2026-10-27"]),
        daily("keeps 14 daily copies and never touches the before-upgrade copy", ["state", "before-v3"] + [f"snap-2026-10-{d:02d}" for d in range(26, 5, -1)]),
        daily("today's copy exists among many: 13 others stay", ["state"] + [f"snap-2026-10-{d:02d}" for d in range(27, 6, -1)]),
        daily("example data is not copied", ["state"], example=True),
    ]
