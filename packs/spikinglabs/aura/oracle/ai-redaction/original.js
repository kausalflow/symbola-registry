// Verbatim from Aura's src/app.html (declarations: reEsc, H, pad, toLocalInput, startOfDay, lc, live, kids, kid, SYNCED, lastSent, nameMap, redact, unredact, deepMap, ai).
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
let lastSent = null;
function nameMap(cid) {
  // Deleted children and entries are included: their names can still be in notes.
  const cs = [...kids().sort((a, b) => (b.id === cid) - (a.id === cid)), ...S.children.filter(c => c.deleted)].filter(c => c.name), map = cs.map((c, i) => [c.name.trim(), i ? `[CHILD ${i + 1}]` : '[CHILD]']);
  [...new Set([S.settings.me, ...S.entries.map(e => e.by)].filter(Boolean))].forEach((n, i) => map.push([n.trim(), `[PARENT ${i + 1}]`]));
  return map.filter(([n]) => n.length > 1).sort((a, b) => b[0].length - a[0].length);
}
const redact = (t, map) => map.reduce((s, [n, p]) => s.replace(new RegExp(`(^|[^\\p{L}])${reEsc(n)}(?=$|[^\\p{L}])`, 'giu'), `$1${p}`), String(t));
const unredact = (t, map) => map.reduce((s, [n, p]) => s.split(p).join(n), String(t));
const deepMap = (v, f) => typeof v === 'string' ? f(v) : Array.isArray(v) ? v.map(x => deepMap(x, f)) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepMap(x, f)])) : v;
async function ai(system, user, schema, cid = kid()?.id, images = []) {
  const p = await aiProvider(); if (!p) throw new Error('AI is off. Choose a service under More to use it.');
  if (images.length && p !== 'key') throw new Error('Reading photos needs your own AI service. Choose one under More.');
  const map = nameMap(cid), sys = system + ' Names are replaced by placeholders such as [CHILD]; keep each placeholder exactly as written.', u = redact(user, map);
  lastSent = { system: sys, user: u + (images.length ? `\n\n[${images.length} photo${images.length > 1 ? 's' : ''}]` : ''), via: p };
  let r;
  if (p === 'key') r = await apiCall(sys, u, schema, images);
  else { const sample = await getSample(), prompt = `${sys}\n\n${u}`;
    r = schema ? await sample.json(prompt + `\n\nReply with only JSON matching this JSON Schema:\n${JSON.stringify(schema)}`, { modelTier: 'quick', cache: false }) : (await sample(prompt, { cache: false })).text; }
  return deepMap(r, t => unredact(t, map));
}
