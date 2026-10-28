// Shared by the oracle adapters (copied into each oracle folder by extract.py). Reads one JSON input per line on
// stdin and writes {"output": ...} or {"error": {...}} per line. The adapters run Aura's own code (original.js,
// lines cut out of src/app.html) inside a function scope with just enough stubs for the browser.
import readline from 'node:readline';
import { readFileSync } from 'node:fs';

process.env.TZ = 'UTC';

export class SpecError extends Error {
  constructor(message, type = 'ValueError') { super(message); this.type = type; }
}

export async function serve(handler) {
  const rl = readline.createInterface({ input: process.stdin });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let reply;
    try { reply = { output: await handler(JSON.parse(line)) }; }
    catch (e) { reply = { error: { type: e instanceof SpecError ? e.type : 'ValueError', message: String(e?.message ?? e) } }; }
    process.stdout.write(JSON.stringify(reply) + '\n');
  }
}

/** A clock the adapter moves by hand, so times do not depend on the real time. */
const RealDate = Date;
export const clock = { t: RealDate.parse('2026-01-01T00:00:00.000Z') };
class FakeDate extends RealDate {
  constructor(...args) { if (args.length === 0) super(clock.t); else super(...args); }
  static now() { return clock.t; }
}
globalThis.Date = FakeDate;
export const at = iso => { const t = RealDate.parse(iso.length === 10 ? iso + 'T00:00:00Z' : iso.endsWith('Z') ? iso : iso + 'Z'); if (Number.isNaN(t)) throw new SpecError('bad time ' + iso); return t; };
export const iso = t => new RealDate(t).toISOString();
export const day = t => new RealDate(t).toISOString().slice(0, 10);

/** Builds the original code: stubs + original.js + an epilogue that returns the pieces the adapter needs. */
export function build(stubs, epilogue, extra = {}) {
  const src = readFileSync(new URL('./original.js', import.meta.url), 'utf8');
  const names = Object.keys(extra);
  return new Function(...names, `'use strict';\n${stubs}\n${src}\n${epilogue}`)(...names.map(n => extra[n]));
}
