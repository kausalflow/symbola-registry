// Verbatim from Aura's src/app.html (declarations: reEsc, H, pad, toLocalInput, startOfDay, lc, live, kids, kid, SYNCED, DRIVE, mediaHome, MEDIA_REF, hasRefs, sha256, b64bytes, bytesB64, mapMedia, packMedia, unpackMedia).
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
const DRIVE = 'https://www.googleapis.com/drive/v3/files', UP = 'https://www.googleapis.com/upload/drive/v3/files';
let mediaHome = null; // { dir, have: file name -> Drive id }
const MEDIA_REF = 'aura-media:', isData = v => typeof v === 'string' && v.startsWith('data:') && v.includes(';base64,'), isRef = v => typeof v === 'string' && v.startsWith(MEDIA_REF);
const hasRefs = d => SYNCED.some(k => Array.isArray(d?.[k]) && d[k].some(x => x && typeof x === 'object' && Object.values(x).some(isRef)));
const sha256 = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
const b64bytes = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const bytesB64 = buf => { const a = new Uint8Array(buf); let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000)); return btoa(s); };
async function mapMedia(d, test, fn) {
  const out = { ...d };
  for (const k of SYNCED) if (Array.isArray(d[k])) {
    out[k] = [];
    for (const x of d[k]) {
      let y = x;
      if (x && typeof x === 'object') for (const [f, v] of Object.entries(x)) if (test(v)) { const r = await fn(v); if (r === undefined) { y = null; break; } y = { ...y, [f]: r }; }
      if (y) out[k].push(y);
    }
  }
  return out;
}
async function packMedia(tok, d) {
  if (!d || typeof d !== 'object') return d;
  const m = await mediaDir(tok);
  return mapMedia(d, isData, async v => {
    const i = v.indexOf(','), head = v.slice(0, i), type = head.slice(5).split(';')[0], name = `${await sha256(v)}.${(type.split('/')[1] || 'bin').replace(/[^\w.+-]/g, '')}`;
    if (!m.have.has(name)) m.have.set(name, await uploadBlob(tok, name, m.dir, type, b64bytes(v.slice(i + 1))));
    return MEDIA_REF + name + '#' + head;
  });
}
async function unpackMedia(tok, d) {
  if (!hasRefs(d)) return { d, missing: 0 };
  const m = await mediaDir(tok); let missing = 0;
  d = await mapMedia(d, isRef, async v => {
    const [name, head] = v.slice(MEDIA_REF.length).split('#'), id = m.have.get(name);
    if (!id || !head) { missing++; return undefined; }
    return head + ',' + bytesB64(await (await gapi(tok, `${DRIVE}/${id}?alt=media`)).arrayBuffer());
  });
  return { d, missing };
}
