import { SRC, SpecError, serve, b64, unb64 } from './common.mts';

await import(`${SRC}/test/setup.ts`);
const crypto_ = await import(`${SRC}/src/lib/crypto.ts`);
const store = await import(`${SRC}/src/lib/store.ts`);
const series = await import(`${SRC}/src/lib/series.ts`);
const model = await import(`${SRC}/src/lib/model.ts`);
const need = (i: any, ...keys: string[]) => {
  for (const k of keys) if (i[k] === undefined || i[k] === null) throw new SpecError(`missing ${k}`);
};

// Copied from src/main.tsx (App and normalizeHash), which cannot be imported without starting the app.
function route(hash: string) {
  const dotted = hash.match(/^#([ms])\.([\w-]{8,64})\.([\w-]+)$/);
  if (dotted) hash = `#/${dotted[1]}/${dotted[2]}/${dotted[3]}`;
  if (hash.startsWith('#/data')) return { route: 'data', id: null, key: null };
  if (hash === '#/crash-test') return { route: 'crash-test', id: null, key: null };
  const m = hash.match(/^#\/m\/([\w-]+)\/([\w-]+)/);
  if (m) return { route: 'meeting', id: m[1], key: m[2] };
  const s = hash.match(/^#\/s\/([\w-]+)\/([\w-]+)(\/overview)?/);
  if (s) return { route: s[3] ? 'series-overview' : 'series', id: s[1], key: s[2] };
  return { route: 'home', id: null, key: null };
}

await serve(async (i: any) => {
  switch (i.op) {
    case 'auth': {
      need(i, 'link_key', 'room_id');
      return { result: (await crypto_.deriveKeys(i.link_key, i.room_id)).auth };
    }
    case 'open': {
      need(i, 'link_key', 'room_id', 'sealed');
      const keys = await crypto_.deriveKeys(i.link_key, i.room_id);
      const plain = await crypto_.open(keys.key, i.sealed);
      const hash = await globalThis.crypto.subtle.digest('SHA-256', plain);
      return { result: { length: plain.length, sha256: Buffer.from(hash).toString('hex') } };
    }
    case 'seal': {
      need(i, 'link_key', 'room_id', 'plaintext');
      const keys = await crypto_.deriveKeys(i.link_key, i.room_id);
      const real = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
      if (i.iv) {
        const iv = unb64(i.iv);
        if (iv.length !== 12) throw new SpecError('iv must be 12 bytes');
        (globalThis.crypto as any).getRandomValues = (a: Uint8Array) => (a.length === 12 ? (a.set(iv), a) : real(a));
      }
      try {
        return { result: await crypto_.seal(keys.key, unb64(i.plaintext)) };
      } finally {
        (globalThis.crypto as any).getRandomValues = real;
      }
    }
    case 'link': {
      need(i, 'kind', 'id', 'key');
      (globalThis as any).window = { RONDEL_CONFIG: i.share_url ? { shareUrl: i.share_url } : {} };
      (globalThis as any).location = { origin: i.origin ?? '', pathname: i.pathname ?? '/' };
      return { result: i.kind === 'meeting' ? store.meetingLink(i.id, i.key) : series.seriesLink(i.id, i.key) };
    }
    case 'route': {
      need(i, 'hash');
      return { result: route(i.hash) };
    }
    case 'new_ids':
      return { result: { room_id: model.randomId(12), key: model.randomId(18) } };
    default:
      throw new SpecError(`unknown op ${i.op}`);
  }
});
