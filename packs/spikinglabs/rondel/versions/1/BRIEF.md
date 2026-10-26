# Rondel

Rondel is an end-to-end encrypted tool for team retrospectives and meetings, with no accounts: you share a
link. People write cards, group, vote, discuss and agree actions (a retro), or run an agenda with a timer,
shared notes, decisions and action items (any meeting). They can prepare before the meeting starts and carry
open actions into the next one. A meeting can repeat daily, weekly or monthly behind one stable link.

It is a static web app plus an optional, very small room server. Everything people write is encrypted in the
browser with a key that lives only in the meeting link (after `#`), so whatever stores or relays the meeting
cannot read it. Teams use it from their browsers; an organisation can run its own copy on Cloudflare, on any
Node host or container, or as plain static files with browser-to-browser sync.

A rebuild is only faithful if it **interoperates** with real Rondel: its links open real meetings, its
encrypted updates and backups open in real clients (and the reverse), its room server speaks to real
browsers, and meeting files, backups and templates saved by any earlier release still open. The components in
this pack pin exactly those surfaces. `PRODUCT.md` says what the rest of the app is.

## Non-goals

- Server-side search, reminders, integrations or any feature that needs the server to read meetings. The
  server must never see content.
- Accounts, passwords or per-person permissions. Anyone with the full link can join and edit; facilitator
  controls and hidden vote totals are conventions in the app, not enforced.
- Replacing the original's code layout, UI styling, animations or exact wording of interface texts and error
  messages. Interface languages beyond English are optional.
- Real-time collaboration beyond what the document format gives: Yjs merges concurrent edits; there is no
  locking or turn-taking.
- Hosting or billing. How an organisation deploys (Cloudflare, Docker) is its own concern; the pack only
  fixes what the server does.

## Priorities

When goals conflict, earlier ones win:

1. Confidentiality: nothing readable leaves the browser; the link key is never sent anywhere; the server
   stores and relays only sealed data.
2. Compatibility: documents, encrypted updates, links, series rooms, backups and templates read and write
   exactly as real Rondel clients do, including everything earlier releases saved.
3. Meeting behaviour: the operations and rules in the meeting, series and template components, exactly.
4. The room-server protocol, auth check, limits and retention, exactly.
5. Working without a server (peer-to-peer) and offline: edits are never lost; they sync when possible.
6. The rest of the app (screens, flows, layout) as `PRODUCT.md` describes; styling is the builder's.

## Who resolves gaps

spikinglabs, as the namespace holder. If the pack doesn't settle something, record the
question and the reading you chose in `NOTES.md` next to your build; obligations marked
`open` in `obligations.toml` are yours to choose.
