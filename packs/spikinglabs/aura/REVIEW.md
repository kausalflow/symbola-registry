# Review: spikinglabs/aura pack (draft)

Drafted from `emptymalei/aura2` @ 0c99b45 (single file `src/app.html`, `CLAUDE.md`, README, docs, smoke test).
Ten components, 74 obligations (5 unchecked, 1 open), 10 assumptions. Each component passes its own spec through
`oracle/<name>/` (Aura's own code, cut verbatim out of `src/app.html` by `oracle/extract.py`, run with Node).
Fact-mutant spot checks (tie `>=`, half-month `due`, 28-day `soon`, keep-48, 60-day cap, case-insensitive
redaction, letter boundary, escape, shrink `<=`, 8 h, tombstone +1, MIME case) were all caught, except two
equivalent ones (age exactly 3.0 months cannot occur; the weight adjustment is the identity for height and head,
whose L is 1).

## Please confirm

**Non-goals**: no medical advice of any kind; no server, accounts or analytics; no kidsfox connection and no
calendar sign-in; no other countries or languages beyond English and the German doctor summary; no
passphrase-encrypted Drive file, "Ask" chat or weekly digest (planned in `docs/official-app-plan.md`, not built).

**Priority order**: 1 data safety (merge, migration, save guard, backups, media) 2 privacy (redaction, recalls)
3 no advice 4 schedules/reminders/percentiles 5 calendar files 6 the rest of the app.

**Licence**: `aura2` has no LICENSE file. I wrote `Apache-2.0` for the pack and components like the other packs;
please choose. Also: the pack covers the whole app (`PRODUCT.md`), whose source stays unlicensed until you say.

## `default` obligations (my guess at your choice)

- `migrate.v-less-log`: a log without a valid `v` is treated as version 1 (see the bug list).
- `save.allow-shrink-persists`: the "delete everything" permission stays armed through refused saves.
- `ai.deleted-children`: names of deleted children are not redacted.
- `ics.escape`: `;` `,` and line breaks are escaped, backslashes are not.
- `ics.fold`: folding at 70 characters (not octets).

Open on purpose: `schedule.month-end` (children born on the 29th to 31st).

## Assumptions to confirm

K-device-clocks, K-drive-version, K-google-client, K-stiko-gba-2026 (tables as of 2026; who re-checks them?),
K-who-tables (shipped as `fixtures/who-lms.json`, extracted from the app), K-recall-feed, K-ai-service,
K-one-timezone, K-ids-unique, K-small-log.

## Behaviour of the original that looks like a bug (the spec follows the original or leaves it open; you decide)

1. **Calendar escaping**: backslashes are not escaped in .ics text (RFC 5545 requires `\\`). A title with `\` is
   written ambiguously.
2. **Calendar folding**: counted in characters, up to 70, but the standard limit is 75 octets; a line of umlauts or
   emoji is longer than 75 bytes (examples 8 and 9 of `ics`). Some calendars may reject or truncate.
3. **A log without `v`** (or `v` 0) is migrated as a version 1 sick-day log: step 1 builds a fresh empty log and
   keeps only children, episodes, entries, measurements, meds and settings, so vaccinations, documents and
   everything else are dropped (a before-v3 copy is kept). A current log should never lack `v`, but one hand-edited
   or damaged would lose data silently.
4. **Month arithmetic**: a child born on the 29th to 31st gets later dates rolled into the next month (JS
   `setMonth`: 31 Jan + 1 month = 3 Mar) and day/week boundaries are fixed 24-hour steps, so around clock changes
   a boundary is an hour off. Left `open` / assumed away (K-one-timezone); the contracts are in UTC.
5. **Deleted children are not redacted** (`ai.deleted-children`): their names stay in free text sent to the AI,
   and `by` names of deleted entries are skipped; a one-letter name is never redacted (so a parent called "J" is
   sent as is).
6. **Fever reminder text** says "more than 3 days" while the rule is 3 days or more.
7. **No wet diaper**: if only dry or poop diapers are logged, the 8 hours count from the illness start, not from
   the first diaper.
8. **Merge ties** keep each phone's own item, so two phones that edit the same item in the same millisecond
   stay different until a later edit (very rare).
9. **Media in nested fields** (a data URL inside a list or sub-object of an item) is not packed into
   `backups/media`; today every photo/sound is a direct field, so nothing is missed.
10. `allow_shrink` stays armed after a refused save (`save.allow-shrink-persists`).
11. U1 shows "missed" for any child whose U1 was not recorded (it is normally done in the hospital); it is not
    pointed out on Today, only listed.

## Left out on purpose

- The doctor summary and emergency card contents and German texts, the fever chart, tooth map, milestones, timers,
  the entry sheets' fields and wording, theme hours, and all layout (described in `PRODUCT.md`, not checked).
- The "Say it" parser, the page-reading prompts and schemas, and the AI handover prompts (they only carry the
  no-advice rule; `ai-redaction` pins what leaves the phone).
- The Drive sync loop, sharing, Picker, resumable upload, PDF-to-Drive, recall fetch timing and storage layout:
  `sync.safe-write`, `reminders.recall-refresh` and `product.no-advice` are `unchecked`, because they need an app
  end-to-end test with a Drive stand-in, not an example.
- `suggestedTrack` defaults by age (feed under 30 months, diapers under 42, solids from 5) and the tag helpers for
  symptom text: described in `PRODUCT.md`.
- No mutants are shipped; `oracle/` has the extraction (`extract.py`), recorders (`record.py`, `cases/`) and
  `make_obligations.py` that wrote `obligations.toml`.

## Questions

1. Should the pack include a US/other schedule later, or is Germany-only final?
2. Do you want the original's AI model (`claude-opus-5-5`) fixed in the pack? I left it as an example in
   `PRODUCT.md`, not an obligation.
3. The Google client ID and Picker key are public by design; the pack names no values. OK?
4. Is the Recall Tracker feed part of the product pack (a rebuild must read it) or optional?

## Answers (2026-10-28)

- **Bug-like defaults: fixed in the pack and in Aura** (L, decision card). emptymalei/aura2#26 makes Aura behave as the
  pack now says, and the oracle is cut from that branch:
  - `ics.escape`: backslashes are escaped too (RFC 5545).
  - `ics.fold`: lines fold at 75 octets of UTF-8, a character is never split.
  - `migrate.v-less-log`: a log without `v` still counts as version 1, but step 1 keeps every collection and field
    it does not convert (new example 11), so nothing is lost.
  - `save.allow-shrink-once` (was `save.allow-shrink-persists`): the permission is used up by the next save attempt,
    even a refused one.
  - `ai.deleted-children`: names of deleted children and on deleted entries are replaced too (new example 19).
  - `schedule.month-end` (was open): months end on the last day of a shorter month, so 31 Aug + 3 months = 30 Nov
    and 29 Feb + 12 months = 28 Feb (new examples 39 to 41).
  All 74 obligations are now `decided`.
- **Countries: Germany only** (L: "keep as is"). The schedules stay STIKO/G-BA as of 2026; no pluggable country tables.
- Also fixed while attesting: the `schedule` description and property left out RSV's `upto 12`, so a property run could
  fail on the original for a child between 2 and 12 months with no RSV dose.
- Still to confirm with L: the licence (Apache-2.0 for now), publisher `spikinglabs`, category "Family". Unless told
  otherwise: no AI model pinned, no Google key values in the pack, Recall Tracker feed optional for a rebuild.
