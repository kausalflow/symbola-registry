// Verbatim from Aura's src/app.html (declarations: reEsc, H, pad, toLocalInput, startOfDay, lc, live, kids, kid, SYNCED, SCHEMA, MIGRATIONS, logVersion, tooNew, NEWER, migrate, emptyState, uid, enc, DRIVE, KEEP_RECENT, HOURLY, prunable, listBackups, uploadNew, snapshot, LOCAL_SNAPS, dbKeys, shareable, localSnapshot).
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const H = 3600e3, DAY = 24 * H;
const pad = n => String(n).padStart(2, '0');
const toLocalInput = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const startOfDay = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const lc = s => String(s || '').toLowerCase();
const live = a => a.filter(x => !x.deleted);
const kids = () => live(S.children);
const kid = () => kids().find(c => c.id === S.child) || kids()[0] || null;
const SYNCED = ['children', 'episodes', 'entries', 'meds', 'measurements', 'growth', 'products', 'vaccines', 'checkups', 'dental', 'appts', 'emergency', 'docs', 'pages'];
const SCHEMA = 3;
const MIGRATIONS = {
  1: o => { // v1 sick-day log: entries belonged to an illness; give each one its child.
    const e = emptyState(), s = { ...e, ...o, app: e.app }; Object.assign(s, { children: o.children || [], episodes: o.episodes || [], measurements: o.measurements || [], meds: o.meds || s.meds, drive: {} });
    s.settings = { ...s.settings, ...(o.settings || {}) };
    const epChild = Object.fromEntries((o.episodes || []).map(e => [e.id, e.childId]));
    s.entries = (o.entries || []).map(e => ({ ...e, child: e.child || epChild[e.ep] }));
    s.child = s.children.find(c => !c.deleted)?.id || null;
    return s;
  },
  2: o => { // v2 kept photos of the vaccination book and U-Heft inside `vaccines` and `checkups`; they become pages of documents.
    // Deterministic (same ids and times on every phone), so two phones that upgrade separately end up with the same log.
    const docs = [...(o.docs || [])], pages = [...(o.pages || [])];
    const move = (list, type) => (list || []).map(x => {
      if (x.kind !== 'page') return x;
      const docId = `${type}-${x.childId}`;
      if (!docs.some(d => d.id === docId)) docs.push({ id: docId, childId: x.childId, type, title: '', note: '', updatedAt: 1 });
      if (!x.deleted && !pages.some(p => p.id === x.id)) pages.push({ id: x.id, docId, childId: x.childId, t: x.t, img: x.img, note: x.note || '', ...(x.order != null ? { order: x.order } : {}), updatedAt: x.updatedAt || 0 });
      return { id: x.id, childId: x.childId, kind: 'page', deleted: true, updatedAt: (x.updatedAt || 0) + 1 };
    });
    return { ...o, vaccines: move(o.vaccines, 'vax'), checkups: move(o.checkups, 'u'), docs, pages };
  },
};
const logVersion = o => Number.isInteger(o?.v) && o.v > 0 ? o.v : 1;
const tooNew = o => !!o && logVersion(o) > SCHEMA;
const NEWER = 'This log was saved by a newer version of Aura. Close Aura fully and open it again to update. Nothing was changed.';
function migrate(o) {
  if (!o || tooNew(o)) return o;
  for (let v = logVersion(o); v < SCHEMA; v++) o = { ...MIGRATIONS[v](o), v: v + 1 };
  return o;
}
function emptyState() {
  return { app: 'aura', v: SCHEMA, example: false, children: [], episodes: [], entries: [], measurements: [], growth: [], products: [], vaccines: [], checkups: [], dental: [], appts: [], emergency: [], docs: [], pages: [],
    meds: [{ id: 'm1', name: 'Paracetamol (acetaminophen)', gapH: 4, updatedAt: 0 }, { id: 'm2', name: 'Ibuprofen', gapH: 6, updatedAt: 0 }],
    settings: { unit: 'C', clientId: '', pickerKey: '', apiKey: '', aiKind: 'anthropic', aiBase: '', aiModel: '', theme: 'auto', me: '', recallCountries: null, docLang: 'en', vaxPlan: 'de', uPlan: 'de', zPlan: 'de' }, child: null, drive: {}, recalls: {}, docTr: {} };
}
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const enc = encodeURIComponent, JSON_H = { 'Content-Type': 'application/json' }, FOLDER_T = 'application/vnd.google-apps.folder';
const DRIVE = 'https://www.googleapis.com/drive/v3/files', UP = 'https://www.googleapis.com/upload/drive/v3/files';
const KEEP_RECENT = 48, KEEP_DAYS = 60;
const HOURLY = /^aura-backup-\d{4}-\d\d-\d\d(-\d\d)?\.json$/, BEFORE = /^aura-log-before-v(\d+)\.json$/;
function prunable(files) { // files sorted newest first
  const days = new Set();
  return files.filter((f, i) => { if (i < KEEP_RECENT) return false; const d = f.name.slice(12, 22); if (days.has(d) || days.size >= KEEP_DAYS) return true; days.add(d); return false; });
}
async function listBackups(tok, dir) {
  const r = await (await gapi(tok, `${DRIVE}?q=${enc(`'${dir}' in parents and trashed=false`)}&orderBy=name desc&pageSize=500&fields=files(id,name)`)).json();
  return (r.files || []).filter(f => HOURLY.test(f.name) || BEFORE.test(f.name));
}
async function uploadNew(tok, name, parent, data) {
  const b = 'aura' + uid(), body = `--${b}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({ name, parents: [parent], mimeType: 'application/json' })}\r\n--${b}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(data)}\r\n--${b}--`;
  return (await (await gapi(tok, `${UP}?uploadType=multipart&fields=id`, { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body })).json()).id;
}
async function snapshot(tok, fileId, data) {
  const hour = toLocalInput(Date.now()).slice(0, 13).replace('T', '-'); if (S.drive.backupHour === hour) return;
  const dir = await backupsDir(tok, fileId), name = `aura-backup-${hour}.json`, old = (await listBackups(tok, dir)).filter(f => HOURLY.test(f.name));
  if (!old.some(f => f.name === name)) await uploadNew(tok, name, dir, await packMedia(tok, data));
  for (const f of prunable(old.filter(f => f.name !== name))) await gapi(tok, `${DRIVE}/${f.id}`, { method: 'DELETE' });
  S.drive.backupHour = hour; persist();
}
const LOCAL_SNAPS = 14;
const dbKeys = () => new Promise((res, rej) => { const q = db.transaction('kv').objectStore('kv').getAllKeys(); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
const shareable = () => ({ app: 'aura', v: SCHEMA, savedAt: Date.now(), ...Object.fromEntries(SYNCED.map(k => [k, S[k]])) });
async function localSnapshot() {
  if (!db || S.example || tooNew(S)) return;
  try {
    const key = 'snap-' + toLocalInput(Date.now()).slice(0, 10), keys = (await dbKeys()).filter(k => String(k).startsWith('snap-')).sort().reverse();
    const tx = db.transaction('kv', 'readwrite'), st = tx.objectStore('kv');
    if (!keys.includes(key)) st.put(shareable(), key);
    keys.filter(k => k !== key).slice(LOCAL_SNAPS - 1).forEach(k => st.delete(k));
  } catch {}
}
