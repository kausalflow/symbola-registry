# Review questions for spikinglabs/rondel

Six components, 72 obligations (67 with checks, 5 about the app as a whole without), 7 assumptions, and a `PRODUCT.md` for the whole app. Every component passes its own spec when the original runs through `oracle/<name>/` (the adapters call Rondel's own TypeScript from the checkout and reduce its result to the JSON the contract states; they never edit it). Every example was recorded from the original.

| component | what it holds | examples | properties |
|---|---|---|---|
| `meeting` | start of a meeting from a template (ids from a seed), every operation on the shared document, next meeting, meeting files | 56 | 8 |
| `series` | periods, meeting names, the walk that decides open/create/closed, room and key per meeting, `.ics`, the series document | 73 | 7 |
| `link-crypto` | key derivation, proof, sealing, links and routes, ids for new meetings, updates stored by 0.26.0 and 0.27.0 | 31 | 6 |
| `backup` | backup files (plain and passphrase), restoring and merging into a browser | 23 | 3 |
| `room` | the room server core: hello/welcome, updates, presence, compaction, delete, expiry, limits | 27 | 6 |
| `template` | template YAML read/write, errors by line, new version, designer warnings, built-in templates | 79 | 6 |

About 100 one-line "fact mutants" (`oracle/fact-mutants.py`: the original with one rule broken, run against the spec, no agent needed) were used as a screen. All are killed except two equivalent ones: counting negative votes (item 2 below) and the week step of `next_period` being 8 days instead of 7, which lands in the same week.

## 1. Non-goals and priorities to confirm

Non-goals in `BRIEF.md`: nothing the server reads (no search, reminders, integrations); no accounts or enforced permissions (facilitator controls and hidden totals are conventions); no fixed layout, styling, animations or wording of texts (the first interface language beyond English is optional); no extra real-time guarantees beyond Yjs merging; hosting and billing are the operator's. Priority order: (1) confidentiality, (2) compatibility with real clients and all earlier files, (3) meeting behaviour, (4) the room-server protocol, auth, limits and retention, (5) working offline and without a server, (6) the rest of the app as `PRODUCT.md` describes it. Is confidentiality above compatibility what you want, and is peer-to-peer (5) really below the server protocol (4)?

## 2. `default` obligations to confirm

- `meeting.card-text-limit`: cards cut at 2,000 characters (the number is in the code, no user-facing reason).
- `meeting.rename`: titles cut at 200 characters, empty ignored.
- `series.label`: `Week 42, 2026`, `October 2026`, `5 Oct 2026` (English only; the app's German labels are not specified).
- `crypto.route`: the odd corners of fragment routing (a dotted id shorter than 8 is not dotted, `#/crash-test` only exactly, extra path after the key ignored).
- `room.limits`: 2,000,000 characters per frame, 25,000,000 per room, 100 connections. Promise or tuning?
- `template.design-checks`: which designer warnings exist and the 90-minute break threshold; by code only, wording is free.
- `app.offline-and-p2p`: the peer-to-peer fallback and offline loading, specified in `PRODUCT.md` but not checked.

## 3. Assumptions to confirm

`K-compatible-clients` (monitored: the `version` error and the format/version in files), `K-device-clocks`, `K-link-stays-private`, `K-names-are-free-text`, `K-one-server-process`, `K-secure-context`, `K-small-meetings`. Only the first has a monitor.

## 4. Behaviour of the original that looks like a bug (the spec does not pin these)

1. `timer_start` accepts a negative duration (`ms`); the timer then shows a negative remaining time. The case was left out of the examples.
2. A negative vote count in a document (only reachable by a crafted update) is dropped from the view; no operation can create one, so the mutant that counts it is unreachable through the contract.

## 5. Left out on purpose

- Anything about layout, styling and wording of the interface, including the German texts.
- The Yjs binary encoding itself: the `meeting` component compares views (and the property tests re-open exports), never bytes of a document.
- The client sync algorithm, the Cloudflare and Node adapters (server, SQLite, Worker), the peer-to-peer transport, the service worker and the release tooling: described in `PRODUCT.md`, five obligations, no checks (7% of the obligations). An `http` driver and a browser driver would be needed to check them.
- Randomness: examples use seeded ids and fixed nonces; random behaviour is covered by properties (fresh nonce per seal, id sizes), not statistical checks.
- The designer UI and the board's drag-and-drop; only the operations they call are specified.

## Answers (spikinglabs, 2026-10-26)

All confirmed as written: the priority order, the seven `default` obligations (now `decided`), and the assumptions. The two suspected bugs stay unpinned.
