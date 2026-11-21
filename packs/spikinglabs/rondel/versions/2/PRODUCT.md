# Rondel: the product

A build of Rondel is a **static web app plus a small room server**, not a set of libraries. The components
(`meeting`, `series`, `link-crypto`, `backup`, `room`, `template`) are the exact core; this file says what
surrounds them. Where it is silent (layout, colours, wording, animations), the builder decides.

## Shape

- A single-page web app in the browser (React 19, Yjs, y-indexeddb for the local copy, Vite; installable as
  a PWA with a service worker that makes the app load offline). Routes live in the URL fragment (`#/...`), so
  the key in a link never reaches any server. Interface in English and German; the language follows the
  browser unless chosen. Light, dark or system theme.
- All meeting data lives in the browser: one Yjs document per meeting (IndexedDB `rondel-<roomId>`) and one
  per series (`rondel-<seriesId>`); small settings in `localStorage` under `rondel:`-prefixed keys: `me`
  ({id, name}), `prefs`, `meetings`, `series`, `templates` (YAML texts), `people`, `lang`, `layout`,
  `voter:<room>`, `drafts:<room>`, `mine:<room>`. The backup file carries exactly these keys and documents.
- Sync, decided once at start from `window.RONDEL_CONFIG.sync` (`auto` | `server` | `p2p`; a claude.ai
  preview adds `artifact`): in `auto`, `GET api/health` next to the app (or at `serverUrl`) answering JSON with
  `rondel: true` means room server, anything else (or a `file:` page) means peer-to-peer. With a server every
  change is sealed with the link-derived key and sent to it; without one, browsers connect directly
  (WebRTC through Trystero with Nostr or BitTorrent trackers as `strategy`, optional `relayUrls` and `turn`),
  with nothing stored anywhere, so a meeting exists only while someone who has it is online.
- A **room server** speaks the `room` component's WebSocket protocol at `api/rooms/<roomId>`, answers
  `GET api/health` with `{"rondel": true, "protocol": 1}` and serves the built app (unknown paths fall back
  to `index.html`; headers: assets cacheable for a year, `referrer-policy: no-referrer`,
  `x-content-type-options: nosniff`). It stores only sealed entries. Two adapters share one `Room`:
  - **Node 22.5+**: HTTP + WebSocket (ping every 25 s), meetings in one SQLite file (`node:sqlite`) per
    data directory. Settings by environment: `PORT` (8787), `DATA_DIR` (`./data`), `STATIC_DIR` (`./dist`),
    `RETENTION_DAYS` (90; 0 keeps meetings until deleted). An hourly sweep deletes rooms unchanged for the
    retention time and with nobody connected. Run exactly one copy. A Docker image runs it on `/data`.
  - **Cloudflare**: a Worker serves the app, one Durable Object per room (SQLite storage, WebSocket
    hibernation: idle open tabs cost nothing, `{"t":"ping"}` is answered with `{"t":"pong"}` without waking the
    room, an alarm enforces retention, `RETENTION_DAYS` in the worker variables; a rate limit of connections
    per address per minute).
- Deployment settings live outside the code in a folder (`site.json` + optional `templates/*.yaml`) applied
  to a built `dist/` by `scripts/site-config.mjs`: it merges the settings into the `RONDEL_CONFIG` block of
  `index.html`, copies templates, and with `sync: "server"` adds a Content-Security-Policy allowing only the
  page's own files and its server. Settings: `name`, `sync`, `serverUrl`, `feedback`, `language`, `lab`,
  `robots`, `templates`, `operator {name, url, contact, hosting, retentionDays}`, `strategy`, `relayUrls`,
  `turn`, `shareUrl`.
- No analytics, no third-party requests (the QR code is drawn in the browser; no online QR service). Markdown
  is rendered to elements, never as raw HTML; links open only `http(s)` and `mailto`.

## Surfaces

Pages (hash routes; the dotted forms `#m.<room>.<key>` and `#s.<id>.<key>` are rewritten to them, as the
`route` operation of `link-crypto` states):

- **Name prompt**: shown before anything else (except `#/data`) until the person has entered a name; the name
  is remembered in this browser (at most 60 characters).
- **Home** (`#/`): the list of this browser's meetings (title, kind, live or closed, open actions) and
  series, "Join a meeting by link", "Open meeting file…", "New meeting" with the template picker, the series
  form, "Design a meeting", preferences (name, theme, language, card and voting defaults, "Back up or
  restore…"), footer with language menu, "Run by <operator>", feedback link, data page link.
- **New meeting**: pick a template (built in, "From your organisation", "My templates"), optional title, create.
  Template cards offer **New version** (copy named "… (v2)"), **Edit** (my templates), **Copy**, **Download .yaml**.
  **Design a meeting** / **Design new…** open the designer: name, stages with minutes, activity, owner, notes
  and screen; columns; voting rules; a run of show with clock times and the `design_checks` warnings; a YAML
  tab editing the same template with errors by line; **Import .yaml…**.
- **Meeting** (`#/m/<room>/<key>`): top bar with title (double-click to rename), who is here, "I'm done" count,
  sync status, Invite, Minutes, Settings, command palette (Ctrl/⌘ K). Left: the agenda with the timer, "Next
  item", start/pause/resume/+1/+5 minutes, an item's notes. Middle: up to two blocks (board, brainstorm,
  discussion notes, action items, decisions, people), newest on top; every block has a fixed home in the right
  side bar and a ⤢ button to move it; layout remembered per browser in `rondel:layout`, a stage's `screen`
  applies when it starts. Board: columns with colours, private drafts then shared cards (or live cards on an
  open board), drag a card onto another to group, group names, votes with dots, full-screen column,
  stage buttons (1 Write … 5 Actions) for facilitators, "Reveal votes". Brainstorm: collect → vote (3 dots) →
  pick (to action or agenda). People: who is here now (here, writing, done) and who joined earlier; the
  creator can remove or allow back. Close / Reopen. Settings: title, card authors, vote limits, secret voting,
  open board, "Use these settings for my new meetings", "Save as a new template…", Delete from server…
  (facilitators; room servers only).
- **Invite**: copy link, "QR code of the meeting link", "Link to this meeting only", invite text.
- **Minutes**: formatted view with "Copy for email" (HTML with inline styles plus Markdown as plain text),
  "Copy Markdown", "Download .md".
- **Series** (`#/s/<id>/<key>`): resolves the current meeting (below) and shows "Opening the current
  meeting…", or the closed state with "Open it to read the minutes, or start another meeting this week."
  `#/s/<id>/<key>/overview`: all meetings of the series, facilitators ("Facilitate this series too"), invite
  text, "Download calendar file (.ics)", "Open next occurrence", "Delete series from server…".
- **Data page** (`#/data`): plain-language statement of what is encrypted, what the server stores, what stays
  in the browser, what files contain, retention and deletion, the public relays of the peer-to-peer fallback,
  and "Check it yourself" (the `npm run verify` commands). Readable before entering a name. Keep it true.
- **Error screen** with a reload button for crashes; `#/crash-test` shows it on purpose.
- Files people touch: **meeting file** (`.json`, `rondel-meeting`), **backup** (`.json`, `rondel-backup`),
  **minutes** (`.md`), **calendar** (`.ics`), **template** (`.yaml`), `site.json`. Formats: see the components.
- Server: `GET api/health`; WebSocket `api/rooms/<roomId>` (8 to 64 URL-safe characters); static files.
- Command line: `npm run build`, `npm start` (Node server), `npm run verify -- <url>` (checks that a site
  sends exactly the files of a build), `node scripts/uptime.mjs <site>` (app page, `api/health`, a real room).

## Flows

1. **Start a meeting.** Home → New meeting → pick a template → optional title → Create. The app makes a room
   id and link key (`link-crypto` `new_ids`), builds the meeting from the template with an unseeded start
   (`meeting` init; random ids), adds the creator as the first person (`join`), stores it locally and opens
   `#/m/<room>/<key>` (`link-crypto` `link`). Outcome: an empty live meeting with the template's agenda, board
   and settings; the link is on the clipboard-ready Invite panel.
2. **Join and sync.** Opening a link (or pasting it into "Join a meeting by link"): derive keys from the
   fragment (`link-crypto` `auth`); with a server, connect to `api/rooms/<room>` and send `hello` with
   `since` = the last stored seq the client has seen (`room`). The `welcome` entries are opened and applied
   to the local document; if the local document holds anything the server lacks (offline edits, a new
   meeting, an opened file) it is sent as an `upd`. Afterwards every local change is sealed and sent as `upd`
   with an increasing `id` (kept until acknowledged), others' changes arrive as `upd` and are applied, and
   presence goes as sealed awareness updates (`aw`) that are re-announced when someone joins. When the
   welcome says the log has more than 150 entries, the client sends `compact` with `upTo` = the last seq it
   has and a sealed snapshot of what the server is known to hold. The connection pings every 10 seconds and
   is dropped if nothing was heard for 25 seconds; it reconnects with back-off (1 s doubling to 30 s) or at
   once when the network returns. `forbidden`, `version` and `gone` errors are final: the screen explains
   (wrong link / reload / deleted) and nothing is retried. While offline everything is kept locally and sent
   after reconnecting. Outcome: everyone with the link sees the same meeting, live or later.
3. **Run a retro.** A facilitator starts the Write stage; people write private drafts, share them (cards
   `share_card`), then Group (`group`, `group_title`), Vote (`vote`, with limits) and Discuss (votes are
   revealed; cards in vote order), then Actions (`add_action`), then Close (`close`). "I'm done" counts
   people; everyone done shows a green mark. Outcome: minutes with the board, votes, notes, decisions, actions.
4. **Run an agenda.** "Next item" or starting an item makes it current and starts its timer (`set_current`);
   notes are shared text (`notes_insert`); decisions and actions are added; brainstorm items collect ideas,
   dots, and turn ideas into actions or agenda topics. Outcome: a record of each topic.
5. **Next meeting.** After closing: "Start the next meeting" creates a meeting with the same template and
   settings; open actions and unfinished extra topics carry over (`meeting` init with `previous`); the new
   meeting names the old one as `previousTitle`. Also possible from a saved meeting file ("Open meeting file…").
6. **Recurring series.** Home → series form (name, repeats daily / weekly / monthly / irregular, template,
   optional first meeting time and length) → a series document is made (`series` `document`) and the series
   link `#/s/<id>/<key>` is shown with invite text and the `.ics` (`series` `ics`). Opening the link: load the
   series document, compute the current period (`series` `period`, local date), decide (`series` `decide`):
   `open` goes to that meeting; `create` makes it with the room and key from `series` `room`, a meeting
   started from the series template with `seed` = that room id, the series' facilitators as facilitators, the
   `series` reference and title "<series name> – <period label>" (`series` `label`), and records it in the
   series document; `closed` shows the closed meeting with "Start another meeting this week" (the next free
   name). "Open next occurrence" prepares the next period's meeting (`next_after`). Titles and closed state
   are kept in step in the series document (`sync_occurrence`). Outcome: everyone with the link lands in the
   same meeting without a server telling them which.
7. **Delete from server.** A facilitator deletes a meeting: in a series the occurrence is first marked
   deleted in the series document (`mark_deleted`), then `delete` is sent; the other browsers are told, drop
   their local copy, and see that it was deleted. "Delete series from server…" deletes every meeting then the
   series document.
8. **Keep a record.** "Save meeting file" downloads `rondel-meeting` JSON (`{format, version: 1, roomId, key,
   title, exportedAt, update}`); "Open meeting file…" restores it as a meeting in this browser, merged if
   the meeting is already known. Minutes as Markdown or email HTML.
9. **Move browsers.** Preferences → Back up or restore… downloads a backup (`backup` `make`, with an optional
   passphrase); restoring in another browser (`backup` `read`, `merge`) adds lists and meetings, never
   removes any, and optionally takes over the person's identity so they stay a facilitator.
10. **Templates.** Write or import YAML (`template` `parse`, errors by line), design visually (the same
    template), save to "My templates" in the browser, download `.yaml`, "New version" (`new_version`), "Save
    as a new template…" from a meeting (`from_meeting`); organisations ship YAML in their `templates/` folder
    (listed in `RONDEL_CONFIG.templates`; a file that fails to parse is skipped with a console warning). The
    built-in templates are those of `template` `builtin`.
11. **Run your own copy.** Build, apply a `site.json`, run the Node server (or deploy the Worker), put HTTPS
    in front (browsers need it for the encryption except on localhost) and pass WebSocket upgrades on `/api/`.
    Retention deletes unchanged meetings after `RETENTION_DAYS`; a browser that still has a copy can upload an
    expired meeting again, but not a deleted one.

## Interfaces

- **Room server** (above); the app also works against a server at another address (`serverUrl`).
- **Peer-to-peer relays** (public Nostr relays or BitTorrent trackers, optional TURN) are used only when no
  server answers or `sync` is `p2p`; with `sync: "server"` the app never contacts them.
- **claude.ai artifact** (optional): inside a preview with the `db`, `room` and `downloads` capabilities the app
  stores and syncs through them and invite links use the dotted form with `shareUrl`.
- No credentials in the app. Deployment secrets (Cloudflare API token and account id) belong to the release
  workflow only.

## Order

If a build cannot do it all, build in this order: (1) the six components; (2) the Node room server;
(3) the browser app against a server: home, new meeting, join, sync, meeting screen with agenda, notes, cards,
votes, actions, decisions, close, minutes; (4) templates and the designer, meeting files; (5) series and
calendar invites; (6) backup and restore; (7) retros' stages, brainstorm, command palette, layout;
(8) peer-to-peer fallback, PWA, German, Cloudflare adapter, the data page and the release tooling.
