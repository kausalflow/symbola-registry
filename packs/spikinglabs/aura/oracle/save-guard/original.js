// Verbatim from Aura's src/app.html (declarations: reEsc, H, pad, toLocalInput, startOfDay, lc, live, kids, kid, SYNCED, SCHEMA, MIGRATIONS, logVersion, tooNew, NEWER, migrate, emptyState, savedCount, itemCount, wellFormed, persist).
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
let savedCount = null, savedExample = false, allowShrink = false;
const itemCount = st => SYNCED.reduce((n, k) => n + st[k].length, 0);
const wellFormed = st => !!st && typeof st === 'object' && !!st.settings && SYNCED.every(k => Array.isArray(st[k]) && st[k].every(x => x && x.id != null));
function persist() {
  const fail = () => toast('Could not save on this device. Storage may be full.'), shrinkOk = allowShrink;
  allowShrink = false;
  if (tooNew(S)) { toast(NEWER); return; }
  if (!wellFormed(S)) { toast('Something went wrong, so this change was not saved. Your saved log is unchanged.'); return; }
  const n = itemCount(S);
  if (savedCount != null && n < savedCount && !savedExample && !shrinkOk) { toast('Something went wrong, so this change was not saved. Your saved log is unchanged.'); return; }
  const done = () => { savedCount = n; savedExample = !!S.example; };
  if (!db) { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); done(); } catch { fail(); } return; }
  try { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(S, 'state'); tx.oncomplete = done; tx.onerror = fail; tx.commit?.(); } catch { fail(); }
}
