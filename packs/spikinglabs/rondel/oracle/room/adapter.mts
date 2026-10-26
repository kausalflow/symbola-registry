import { SRC, SpecError, serve } from './common.mts';

const roomMod = await import(`${SRC}/server/core/room.ts`);
const memory = await import(`${SRC}/server/core/memory.ts`);

/** Long data texts would fill the output: report them as null with their size. */
const brief = (v: any): any => {
  if (Array.isArray(v)) return v.map(brief);
  if (v && typeof v === 'object') {
    const o: any = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'entries' ? brief(x) : x]));
    if (typeof o.data === 'string' && o.data.length > 40) return { ...o, data: null, size: o.data.length };
    return o;
  }
  return v;
};

await serve(async (input: any) => {
  const store = new memory.MemoryStore();
  let nowMs = 1_700_000_000_000;
  store.now = () => nowMs;
  let room = new roomMod.Room(store, input.retention_days ?? 90);
  const frames: Record<string, any[]> = {};
  const closed: Record<string, any> = {};
  const conns = new Map<string, any>();
  const results: any[] = [];
  const mk = (name: string) => {
    const conn = {
      send: (t: string) => {
        const m = JSON.parse(t);
        if (m.t === 'error') delete m.message;
        (frames[name] ??= []).push(brief(m));
      },
      close: (code?: number, reason?: string) => {
        closed[name] = { code: code ?? null, reason: reason ?? null };
      },
      authed: () => {},
    };
    frames[name] ??= [];
    conns.set(name, conn);
    return conn;
  };
  for (const e of input.events ?? []) {
    let result: any = null;
    switch (e.do) {
      case 'open': {
        const names = e.count ? Array.from({ length: e.count }, (_, i) => `${e.conn}${i + 1}`) : [e.conn];
        for (const n of names) room.open(mk(n), !!e.authed);
        break;
      }
      case 'send': {
        const conn = conns.get(e.conn);
        if (!conn) throw new SpecError(`no connection ${e.conn}`);
        let text: string;
        if (e.text !== undefined && e.text !== null) text = e.text;
        else if (e.text_size !== undefined && e.text_size !== null) text = 'x'.repeat(e.text_size);
        else {
          const frame = { ...e.frame };
          if (e.data_size !== undefined && e.data_size !== null) frame.data = 'x'.repeat(e.data_size);
          text = JSON.stringify(frame);
        }
        await room.message(conn, text);
        break;
      }
      case 'close': {
        const conn = conns.get(e.conn);
        if (!conn) throw new SpecError(`no connection ${e.conn}`);
        room.close(conn);
        break;
      }
      case 'clock':
        nowMs = e.ms;
        break;
      case 'expire':
        result = await room.expire(e.ms);
        break;
      case 'expires_at':
        result = await room.expiresAt();
        break;
      case 'restart':
        room = new roomMod.Room(store, input.retention_days ?? 90);
        break;
      default:
        throw new SpecError(`unknown event ${e.do}`);
    }
    results.push(result);
  }
  return {
    frames: Object.fromEntries(Object.entries(frames).filter(([, v]) => v.length)), closed, results,
    entries: brief(await store.entriesSince(0)),
    has_auth: (await store.getAuthHash()) !== null,
    gone: await store.isGone(),
    room_id_ok: (input.room_ids ?? []).map((id: string) => roomMod.ROOM_ID.test(id)),
  };
});
