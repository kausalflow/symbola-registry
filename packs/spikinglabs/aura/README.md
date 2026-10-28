# Aura pilot

The fourth spec pack built from a real product, and the first consumer app: [emptymalei/aura2](https://github.com/emptymalei/aura2) at 4a6f683 (with [#26](https://github.com/emptymalei/aura2/pull/26)), a serverless baby and child log (an installable web app in one HTML file). Data lives on the phone and, if the parent connects it, in one JSON file in their own Google Drive that a partner can share.

| Path | What it is | Ships to buyers |
| --- | --- | --- |
| `versions/1/` | BRIEF, PRODUCT (the whole app), AGENTS, 10 assumptions, 74 obligations, ten components | yes |
| `attestations/` | Aura itself attested against all ten components, with the runner key | yes, as evidence |
| `oracle/` | Adapters that run Aura's own code per component (`extract.py` cuts it verbatim out of `src/app.html`; Node), the case generators and `make_obligations.py` | no |
| `REVIEW.md` | Questions for the publisher, with the answers | no |

## How it went

1. **Extract.** A blind `symbola extract` (1 round, about 29 minutes), with a hint naming the pure logic worth pinning. It produced ten components:
   - `merge`: item-by-item merge with tombstones
   - `migrate`: log versions 1 to 3
   - `save-guard`: never save a malformed, too-new or shrunken log
   - `growth-percentile`: WHO LMS percentiles
   - `schedule`: German vaccination (STIKO), checkup (U1 to J1) and dental (Z1 to Z6) status and calendar dates
   - `reminders`: the fixed reminder rules and medicine gaps
   - `backup-retention`: which Drive backups are kept
   - `media-pack`: photos and sounds kept once in `backups/media`
   - `ai-redaction`: what an AI call may contain
   - `ics`: calendar files and Google Calendar links
2. **Review.** The extract found five behaviours that looked like bugs, and left month-end dates open. The publisher chose to fix them in both the pack and Aura (aura2#26), so all 74 obligations are `decided`. Schedules stay Germany only.
3. **Not yet checked.** Five obligations have no checks (7%): the no-advice rule across every text and prompt, the copy kept before a migration, the recall refresh, the Drive write path, and what else an AI call leaves out. They need an end-to-end app test with a Drive stand-in.
