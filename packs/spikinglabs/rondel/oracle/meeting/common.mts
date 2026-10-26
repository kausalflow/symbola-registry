// Shared by the oracle adapters: reads one JSON input per line on stdin, writes {"output": ...} or
// {"error": {...}} per line. The adapters run Rondel's own TypeScript, loaded from the checkout in
// RONDEL_SRC (default /root/w/rondel) with tsx; the command in symbolon-impl.toml starts there.
import readline from 'node:readline';

export const SRC = process.env.RONDEL_SRC ?? '/root/w/rondel';
process.env.TZ = 'UTC';

export class SpecError extends Error {
  constructor(message: string, public type = 'ValueError') {
    super(message);
  }
}

export async function serve(handler: (input: any) => unknown | Promise<unknown>) {
  const rl = readline.createInterface({ input: process.stdin });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let reply: unknown;
    try {
      reply = { output: await handler(JSON.parse(line)) };
    } catch (e: any) {
      reply = { error: { type: e instanceof SpecError ? e.type : 'ValueError', message: String(e?.message ?? e) } };
    }
    process.stdout.write(JSON.stringify(reply) + '\n');
  }
}

/** A clock the adapter moves by hand, so times in the output do not depend on the real time. */
const RealDate = Date;
export const clock = { t: RealDate.parse('2026-01-01T00:00:00.000Z') };
class FakeDate extends RealDate {
  constructor(...args: any[]) {
    if (args.length === 0) super(clock.t);
    else super(...(args as [any]));
  }
  static now() {
    return clock.t;
  }
}
(globalThis as any).Date = FakeDate;

export const b64 = (u: Uint8Array) => Buffer.from(u).toString('base64');
export const unb64 = (s: string) => new Uint8Array(Buffer.from(s, 'base64'));
