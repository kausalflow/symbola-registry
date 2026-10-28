import { serve, build, clock, at, SpecError } from './common.mjs';

// Drive and the phone's database are replaced by small fakes that record what the original asks of them.
const api = build(`let S = null, db = null; const persist = () => {}; const packMedia = async (tok, d) => d; const backupsDir = async () => 'dir';
  let drive = null, keys = [], puts = [], dels = [];
  const gapi = async (tok, url, opts = {}) => {
    if (opts.method === 'DELETE') { drive.deleted.push(url.split('/').pop()); return {}; }
    if (opts.method === 'POST') { drive.uploaded.push(JSON.parse(opts.body.split('\\r\\n')[3]).name); return { json: async () => ({ id: 'new' }) }; }
    return { json: async () => ({ files: drive.files.map(name => ({ id: name, name })) }) };
  };
  db = { transaction: () => ({ objectStore: () => ({
    getAllKeys: () => { const q = {}; queueMicrotask(() => { q.result = keys; q.onsuccess(); }); return q; },
    put: (v, k) => puts.push(k), delete: k => dels.push(k) }) }) };`,
  `return { setS: x => { S = x; }, prunable, async snapshot(files, hour) { drive = { files, uploaded: [], deleted: [] }; S.drive = hour ? { backupHour: hour } : {}; await snapshot('tok', 'file', {}); return { uploaded: drive.uploaded[0] ?? null, deleted: drive.deleted }; },
    async local(k) { keys = k; puts = []; dels = []; await localSnapshot(); return { puts, dels }; }, KEEP_RECENT, LOCAL_SNAPS };`);

await serve(async i => {
  clock.t = at(i.now ?? '2026-10-27T10:00:00Z');
  api.setS({ example: !!i.example, v: 3, drive: {} });
  switch (i.op) {
    case 'prune': return { delete: api.prunable(i.files.map(name => ({ name }))).map(f => f.name) };
    case 'snapshot': {
      const r = await api.snapshot(i.files, i.done_hour ?? null);
      return { upload: r.uploaded, delete: r.deleted };
    }
    case 'daily-copy': {
      const r = await api.local(i.keys);
      return { put: r.puts[0] ?? null, delete: r.dels };
    }
    default: throw new SpecError('unknown op ' + i.op);
  }
});
