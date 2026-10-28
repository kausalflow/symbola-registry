Which copies of the log Aura keeps in the parent's own Google Drive and on the phone, and which it deletes. The
Drive file `Aura/aura-log.json` is the log; before the app overwrites it, it saves the file as it was into the
folder `Aura/backups`. `op` picks the rule.

File names in that folder: hourly copies `aura-backup-YYYY-MM-DD-HH.json` (local date and hour; the older
`aura-backup-YYYY-MM-DD.json` without hour also counts as an hourly copy) and, from a format upgrade,
`aura-log-before-vN.json`. Any other name in the folder is not Aura's and is never listed, kept or deleted.
The before-upgrade copies are never deleted.

prune (files): `files` are hourly copy names, newest first (the folder listing sorted by name, descending).
The answer {delete} lists the names to delete, in the same order. Kept: the 48 newest, and from the older ones
one per calendar day (the day is characters 12 to 21 of the name, YYYY-MM-DD): the newest file of each day, for
at most 60 different days counted among the older files only (a day that also occurs among the 48 newest is
counted and kept again once; days beyond the 60th and every other file are deleted).

snapshot (now, done_hour, files): the step the app takes before a write to the Drive file. `now` is the local
time as ISO (the hour is its first 13 characters, YYYY-MM-DDTHH, written YYYY-MM-DD-HH); done_hour is the hour
of the last snapshot this phone made (null if none); `files` is the folder listing, newest name first, with any
names. The answer {upload, delete}: if done_hour equals the current hour, nothing at all (upload null,
delete []). Otherwise upload is the name `aura-backup-<hour>.json`, unless that name is already in the folder
(null then); and delete is prune applied to the folder's hourly copies other than that name. At most one copy per
hour, however often the app writes.

daily-copy (now, keys, example): the phone's own daily copy of the whole log in its local database. `keys` are
the keys the database holds: "state" (the log), "before-vN" (never touched) and "snap-YYYY-MM-DD" (daily
copies). The answer {put, delete}: nothing (put null, delete []) when `example` is true (example data is not
worth keeping); otherwise put is "snap-<today's local date>" unless that key exists (null then), and delete
lists every other "snap-" key beyond the newest 13 of them (newest first by name), so with today's copy 14 daily
copies remain.
