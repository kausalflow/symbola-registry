"""Fact mutants: run the spec against Rondel's own code with one rule broken.

    python oracle/fact-mutants.py [name ...]

Copies the source checkout to a scratch directory, applies each one-line change, runs `symbola test`
for the component the rule belongs to (the adapters read the code from RONDEL_SRC) and reports whether
the spec rejects it. A mutant the spec accepts is a rule only the prose or nothing pins down.
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

here = Path(__file__).resolve().parent
pack = here.parent / "versions" / "1" / "components"
original = Path(os.environ.get("RONDEL_SRC", "/root/w/rondel"))
scratch = Path(os.environ.get("MUTANT_DIR", "/tmp/claude-0/scratch/mut"))

# (name, component, file, old, new)
M = [
    ("vote-user-limit-off-by-one", "meeting", "src/lib/ops.ts", "used >= v.meta.settings.votesPerUser", "used > v.meta.settings.votesPerUser"),
    ("vote-card-limit-off-by-one", "meeting", "src/lib/ops.ts", "cur >= v.meta.settings.votesPerCard", "cur > v.meta.settings.votesPerCard"),
    ("phase-actions-keeps-votes-hidden", "meeting", "src/lib/ops.ts", "if ((p === 'discuss' || p === 'actions') && !meta().settings.votesRevealed)", "if ((p === 'discuss') && !meta().settings.votesRevealed)"),
    ("set-current-leaves-previous-open", "meeting", "src/lib/ops.ts", "if (prev && prev !== id) patch(m.agenda, prev, { done: true });", ""),
    ("join-debounce-one-minute", "meeting", "src/lib/ops.ts", "< 5 * 60_000", "< 60_000"),
    ("creator-can-be-removed", "meeting", "src/lib/ops.ts", "if (id === mt.createdBy) return;", ""),
    ("single-card-groups-stay", "meeting", "src/lib/ops.ts", "(counts.get(c.groupId) ?? 0) < 2", "(counts.get(c.groupId) ?? 0) < 1"),
    ("grouped-card-keeps-its-column", "meeting", "src/lib/ops.ts", "groupTitle: null, columnId: t.columnId }", "groupTitle: null }"),
    ("column-delete-keeps-cards", "meeting", "src/lib/ops.ts", "m.cards.forEach((c, cid) => c.columnId === id && m.cards.delete(cid));", ""),
    ("ungroup-loses-title", "meeting", "src/lib/ops.ts", "groupTitle: xid === next.id ? title : x.groupTitle", "groupTitle: x.groupTitle"),
    ("move-to-neighbour-not-mean", "meeting", "src/lib/model.ts", "return (before + after) / 2;", "return before + 0.5;"),
    ("carry-over-all-actions", "meeting", "src/lib/model.ts", "if (a.status !== 'open') continue;", ""),
    ("carry-over-template-topics", "meeting", "src/lib/model.ts", "templateTitles.has(a.title) || ", ""),
    ("carry-over-stage-topics", "meeting", "src/lib/model.ts", " || (a.activity && a.activity !== 'topic')) continue;", ") continue;"),
    ("retro-defaults-swapped", "meeting", "src/lib/model.ts", "votesPerUser: retro ? 5 : 3, votesPerCard: retro ? 3 : 1", "votesPerUser: retro ? 3 : 5, votesPerCard: retro ? 1 : 3"),
    ("retro-starts-without-phase", "meeting", "src/lib/model.ts", "(t.type === 'retro' ? 'write' : null)", "null"),
    ("seeded-id-ignores-length", "meeting", "src/lib/model.ts", "bytes[8] = text.length & 255;", "bytes[8] = 0;"),
    ("idea-dots-five", "meeting", "src/lib/model.ts", "export const IDEA_DOTS = 3;", "export const IDEA_DOTS = 5;"),
    ("add-agenda-keeps-phase-null", "meeting", "src/lib/ops.ts", "if (isBoardActivity(activity) && !meta().phase) setMeta('phase', activity);", ""),
    ("open-board-cards-anonymous", "meeting", "src/lib/ops.ts", "meta().settings.showAuthors || meta().settings.openBoard ? me.name : null", "meta().settings.showAuthors ? me.name : null"),
    ("card-text-limit-2001", "meeting", "src/lib/ops.ts", "text: d.text.trim().slice(0, 2000)", "text: d.text.trim().slice(0, 2001)"),
    ("timer-add-paused-keeps-duration", "meeting", "src/lib/ops.ts", "else saveTimer({ ...t, remainingMs: Math.max(0, t.remainingMs + ms), durationMs: t.durationMs + ms });", "else saveTimer({ ...t, remainingMs: Math.max(0, t.remainingMs + ms) });"),
    ("close-keeps-timer", "meeting", "src/lib/ops.ts", "setMeta('closedAt', new Date().toISOString()); saveTimer(idleTimer());", "setMeta('closedAt', new Date().toISOString());"),
    ("negative-votes-counted", "meeting", "src/lib/model.ts", "if (!n || n < 0) return;\n    votes[cardId]", "if (!n) return;\n    votes[cardId]"),
    ("pause-can-go-negative", "meeting", "src/lib/ops.ts", "remainingMs: Math.max(0, t.endsAt - Date.now())", "remainingMs: t.endsAt - Date.now()"),
    ("idea-to-agenda-five-minutes", "meeting", "src/lib/ops.ts", "durationMin: 10, owner: '', done: false, position: nextPosition([...m.agenda.values()]) });\n        m.notes.set(id, new Y.Text());\n        patch(m.ideas", "durationMin: 5, owner: '', done: false, position: nextPosition([...m.agenda.values()]) });\n        m.notes.set(id, new Y.Text());\n        patch(m.ideas"),
    ("title-hyphen-not-en-dash", "meeting", "src/lib/model.ts", "`${t.name} – ${date}`", "`${t.name} - ${date}`"),
    ("settings-from-previous-reveal", "meeting", "src/lib/model.ts", "{ ...prev.meta.settings, votesRevealed: false }", "{ ...prev.meta.settings }"),
    ("default-column-colours-from-zero", "meeting", "src/lib/ops.ts", "COLORS[cols.length % COLORS.length]", "COLORS[(cols.length + 1) % COLORS.length]"),
    ("rename-limit-300", "meeting", "src/lib/ops.ts", "title.trim().slice(0, 200)", "title.trim().slice(0, 300)"),
    ("notes-lost-on-agenda-delete", "meeting", "src/lib/ops.ts", "        m.agenda.delete(id);\n        m.notes.delete(id);", "        m.agenda.delete(id);"),

    ("week-starts-on-sunday", "series", "src/lib/series.ts", "const day = t.getUTCDay() || 7;", "const day = t.getUTCDay() + 1;"),
    ("next-week-is-eight-days", "series", "src/lib/series.ts", "else d.setDate(d.getDate() + 7);", "else d.setDate(d.getDate() + 8);"),
    ("deleted-meetings-reopen", "series", "src/lib/series.ts", "o?.status === 'closed' || o?.status === 'deleted'", "o?.status === 'closed'"),
    ("room-id-16-bytes", "series", "src/lib/series.ts", "${seriesKey}:${occ}`, 12)", "${seriesKey}:${occ}`, 16)"),
    ("monthly-base-keeps-day", "series", "src/lib/series.ts", "return cadence === 'monthly' ? m[1].slice(0, 7) : m[1];", "return m[1];"),
    ("ics-minimum-duration-one", "series", "src/lib/series.ts", "Math.max(5, info.durationMin)", "Math.max(1, info.durationMin)"),
    ("ics-fold-at-76", "series", "src/lib/series.ts", "(out.length ? 74 : 75)", "(out.length ? 75 : 76)"),
    ("ics-no-semicolon-escape", "series", "src/lib/series.ts", ".replace(/;/g, '\\\\;')", ""),
    ("deleted-occurrence-resurrects", "series", "src/lib/series.ts", "if (cur?.status === 'deleted') return;", ""),
    ("series-rename-limit-200", "series", "src/lib/series.ts", "name.trim().slice(0, 120)", "name.trim().slice(0, 200)"),
    ("none-cadence-weekly-rule", "series", "src/lib/series.ts", "none: null,", "none: 'FREQ=WEEKLY',"),
    ("next-after-skips-gaps", "series", "src/lib/series.ts", "while (occurrences[occName('all', n)]) n++;", "n = Object.keys(occurrences).length + 1;"),
    ("closed-offers-wrong-number", "series", "src/lib/series.ts", "return { kind: 'closed', last, next: occ, n, deleted: occurrences[last].status === 'deleted' };", "return { kind: 'closed', last, next: occ, n: n - 1, deleted: occurrences[last].status === 'deleted' };"),

    ("salt-prefix", "link-crypto", "src/lib/crypto.ts", "`rondel:${roomId}`", "`rondel-${roomId}`"),
    ("auth-info-label", "link-crypto", "src/lib/crypto.ts", "info: enc.encode('auth-v1')", "info: enc.encode('auth-v2')"),
    ("content-info-label", "link-crypto", "src/lib/crypto.ts", "info: enc.encode('content-v1')", "info: enc.encode('content-v2')"),
    ("link-key-base64-not-url", "link-crypto", "src/lib/crypto.ts", "unb64url(linkKey)", "unb64(linkKey)"),
    ("meeting-link-hash-form", "link-crypto", "src/lib/store.ts", "#/m/${roomId}/${key}", "#/meeting/${roomId}/${key}"),
    ("share-link-keeps-fragment", "link-crypto", "src/lib/store.ts", "share.split('#')[0]}#m.", "share}#m."),
    ("random-room-id-shorter", "link-crypto", "src/lib/model.ts", "export function randomId(bytes = 9) {", "export function randomId(bytes = 9) {\n  if (bytes === 12) bytes = 9;"),

    ("backup-fewer-iterations", "backup", "src/lib/backup.ts", "const ITERATIONS = 310_000;", "const ITERATIONS = 100_000;"),
    ("merge-tie-prefers-backup", "backup", "src/lib/backup.ts", "(y.updatedAt ?? '') > (x.updatedAt ?? '') ? y : x", "(y.updatedAt ?? '') >= (x.updatedAt ?? '') ? y : x"),
    ("prefs-backup-wins", "backup", "src/lib/backup.ts", "{ ...v, ...(cur ?? {}), lastSeries", "{ ...(cur ?? {}), ...v, lastSeries"),
    ("identity-takes-backup-name", "backup", "src/lib/backup.ts", "name: cur?.name || v.name", "name: v.name"),
    ("voter-ids-overwritten", "backup", "src/lib/backup.ts", "else if (current[k] === undefined) changes[k] = raw;", "else changes[k] = raw;"),
    ("drafts-backup-wins", "backup", "src/lib/backup.ts", "unionBy(cur ?? [], v, (d: any) => d.id ?? JSON.stringify(d))", "unionBy(cur ?? [], v, (d: any) => d.id ?? JSON.stringify(d), (x: any, y: any) => y)"),
    ("version-check-dropped", "backup", "src/lib/backup.ts", "if (f.version !== 1) throw", "if (false) throw"),
    ("people-union-sorted", "backup", "src/lib/backup.ts", "set(k, [...new Set([...(cur ?? []), ...v])]);", "set(k, [...new Set([...(cur ?? []), ...v])].sort());"),

    ("auth-any-proof", "room", "server/core/room.ts", "else if (known !== hash) return", "else if (false) return"),
    ("auth-min-length-8", "room", "server/core/room.ts", "msg.auth.length < 16", "msg.auth.length < 8"),
    ("connections-101", "room", "server/core/room.ts", "this.conns.size >= LIMITS.maxConnections", "this.conns.size > LIMITS.maxConnections"),
    ("expire-ignores-open-connections", "room", "server/core/room.ts", "if (this.conns.size > 0) return Math.max(at, now + DAY);", ""),
    ("compact-keeps-snapshot-seq-entry", "room", "server/core/memory.ts", "this.entries.filter((e) => e.seq > upTo)", "this.entries.filter((e) => e.seq >= upTo)"),
    ("presence-echoed", "room", "server/core/room.ts", "if (c === from || !s.authed) continue;", "if (!s.authed) continue;"),
    ("room-limit-inclusive", "room", "server/core/room.ts", "bytes + msg.data.length > LIMITS.maxRoomBytes", "bytes + msg.data.length >= LIMITS.maxRoomBytes"),
    ("delete-without-tombstone", "room", "server/core/room.ts", "await this.store.clear(true);", "await this.store.clear(false);"),
    ("welcome-counts-self", "room", "server/core/room.ts", "others: this.authedCount() - 1, entryCount", "others: this.authedCount(), entryCount"),
    ("frame-limit-inclusive", "room", "server/core/room.ts", "text.length > LIMITS.maxFrame", "text.length >= LIMITS.maxFrame"),
    ("room-id-65", "room", "server/core/room.ts", "{8,64}", "{8,65}"),
    ("gone-checked-after-auth", "room", "server/core/room.ts", "if (await this.store.isGone()) return this.fail(conn, 'gone', 'This meeting was deleted from the server');\n      if (typeof msg.auth !== 'string' || msg.auth.length < 16) return this.fail(conn, 'bad-request', 'Missing auth');", "if (typeof msg.auth !== 'string' || msg.auth.length < 16) return this.fail(conn, 'bad-request', 'Missing auth');\n      if (await this.store.isGone()) return this.fail(conn, 'gone', 'This meeting was deleted from the server');"),
    ("close-code-4001", "room", "server/core/room.ts", "conn.close(4000, code)", "conn.close(4001, code)"),
    ("version-after-auth", "room", "server/core/room.ts", "if (msg.v !== PROTOCOL_VERSION) return this.fail(conn, 'version', 'Please reload the page to get the latest version');", ""),
    ("peers-on-leave-missing", "room", "server/core/room.ts", "if (state?.authed) this.broadcast(conn, { t: 'peers', others: 0, joined: false }, true);", ""),
    ("ping-unauthenticated-ok", "room", "server/core/room.ts", "if (!state.authed) {\n      if (msg.t !== 'hello')", "if (!state.authed) {\n      if (msg.t === 'ping') return this.send(conn, { t: 'pong' });\n      if (msg.t !== 'hello')"),
    ("since-not-number-fails", "room", "server/core/room.ts", "Number.isFinite(msg.since) ? msg.since : 0", "msg.since"),

    ("minutes-601", "template", "src/lib/templates.ts", "minutes: 600 }", "minutes: 601 }"),
    ("slug-49", "template", "src/lib/templates.ts", "slice(0, 48);\n\n/** Parse", "slice(0, 49);\n\n/** Parse"),
    ("votes-100", "template", "src/lib/templates.ts", "v <= 99", "v <= 100"),
    ("anonymous-not-inverted", "template", "src/lib/templates.ts", "k === 'anonymous_cards' ? !v : v;\n        } else err", "v;\n        } else err"),
    ("break-needed-from-90", "template", "src/lib/templates.ts", "if (total > 90 && first('break') < 0)", "if (total >= 90 && first('break') < 0)"),
    ("version-starts-at-3", "template", "src/lib/templates.ts", ": 2; ; n++", ": 3; ; n++"),
    ("short-colours-accepted", "template", "src/lib/templates.ts", "/^#[0-9a-f]{6}$/i", "/^#[0-9a-f]{3,6}$/i"),
    ("name-81", "template", "src/lib/templates.ts", "{ required: true, max: 80 });\n  let type", "{ required: true, max: 81 });\n  let type"),
    ("columns-13", "template", "src/lib/templates.ts", "columns: 12,", "columns: 13,"),
    ("agenda-41", "template", "src/lib/templates.ts", "agenda: 40,", "agenda: 41,"),
    ("screen-middle-three", "template", "src/lib/model.ts", "export const MIDDLE_MAX = 2;", "export const MIDDLE_MAX = 3;"),
    ("unknown-keys-ignored", "template", "src/lib/templates.ts", "if (!allowed.includes(k)) err(", "if (false) err("),
    ("default-minutes-ten", "template", "src/lib/templates.ts", "let minutes = 5;", "let minutes = 10;"),
    ("plain-agenda-ten", "template", "src/lib/templates.ts", "durationMin: 5 };\n    if (!a ||", "durationMin: 10 };\n    if (!a ||"),
    ("saved-yaml-keeps-id", "template", "src/lib/templates.ts", "const out: Record<string, unknown> = { name: t.name, type: t.type };", "const out: Record<string, unknown> = { id: t.id, name: t.name, type: t.type };"),
    ("from-meeting-drops-open-board", "template", "src/lib/templates.ts", "...(s.openBoard ? { openBoard: true } : {})", ""),
    ("from-meeting-name-title-first", "template", "src/lib/templates.ts", "name: v.meta.seriesName ?? v.meta.title,", "name: v.meta.title,"),
    ("breaks-need-stage-count", "template", "src/lib/templates.ts", "for (const s of stages) if (s.durationMin === 0)", "for (const s of stages) if (s.durationMin === 0 && s.activity !== 'break')"),
]


def run(name, component, file, old, new):
    shutil.rmtree(scratch / "src", ignore_errors=True)
    for d in ("src", "server", "test", "scripts"):
        shutil.rmtree(scratch / d, ignore_errors=True)
        shutil.copytree(original / d, scratch / d)
    path = scratch / file
    text = path.read_text()
    if old not in text:
        return "NO-MATCH", ""
    path.write_text(text.replace(old, new, 1))
    env = {**os.environ, "RONDEL_SRC": str(scratch)}
    done = subprocess.run(["symbola", "test", str(pack / component / "versions" / "1"), str(here / component)], capture_output=True, text=True, env=env, timeout=1800)
    failed = [line[2:].strip() for line in done.stdout.splitlines() if line.startswith("✗")]
    return ("KILLED" if failed else "SURVIVED"), "; ".join(failed[:4])


if __name__ == "__main__":
    want = set(sys.argv[1:])
    survivors = []
    for name, component, file, old, new in M:
        if want and name not in want and component not in want:
            continue
        verdict, why = run(name, component, file, old, new)
        print(f"{verdict:9} {component:12} {name}  {why[:150]}", flush=True)
        if verdict != "KILLED":
            survivors.append(name)
    print(f"{len(survivors)} not killed: {survivors}")
