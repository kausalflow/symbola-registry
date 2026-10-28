// Verbatim from Aura's src/app.html (declarations: reEsc, H, pad, toLocalInput, startOfDay, lc, live, kids, kid, FEVER_C, SYMPTOMS, hasTag, ageMonths, childOf, esc, fmtTime, fmtDay, fmtDT, dur, ago, dt, dnum, showT, isWet, alerts, medGap, BACKUP_DAYS, backupDue, fold, words, recallMatch, inEnglish, recallCountryCodes, tracksCountry, recallList, recallNew, recallAlerts).
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const H = 3600e3, DAY = 24 * H;
const pad = n => String(n).padStart(2, '0');
const toLocalInput = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const startOfDay = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const lc = s => String(s || '').toLowerCase();
const live = a => a.filter(x => !x.deleted);
const kids = () => live(S.children);
const kid = () => kids().find(c => c.id === S.child) || kids()[0] || null;
const FEVER_C = 38.0, EXAMPLE_V = 10;
const SYMPTOMS = ['Fever', 'Cough', 'Runny nose', 'Sore throat', 'Ear pain', 'Headache', 'Tummy ache', 'Rash', 'Diarrhea', 'Fast breathing', 'Wheezing', 'Red eyes', 'Very sleepy / floppy', 'Irritable', 'Poor appetite', 'Not drinking'];
const hasTag = (text, tag) => new RegExp('(^|[^a-z])' + reEsc(tag.toLowerCase()) + '($|[^a-z])').test(String(text || '').toLowerCase());
const ageMonths = c => c?.dob ? (Date.now() - new Date(c.dob)) / (30.44 * DAY) : null;
const childOf = ep => ep && live(S.children).find(c => c.id === ep.childId);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtTime = t => new Date(t).toLocaleTimeString(dLocale(), { hour: '2-digit', minute: '2-digit' });
const fmtDay = t => new Date(t).toLocaleDateString(dLocale(), { weekday: 'short', month: 'short', day: 'numeric' });
const fmtDT = t => fmtDay(t) + ' ' + fmtTime(t);
function dur(ms) { const u = dt('dur'), m = Math.max(0, Math.round(ms / 60000)); if (m < 60) return m + ' ' + u[0]; const h = Math.floor(m / 60), r = m % 60; if (h < 24) return h + ' ' + u[1] + (r ? ' ' + r + ' ' + u[2] : ''); return Math.floor(h / 24) + ' ' + u[3] + ' ' + (h % 24) + ' ' + u[1]; }
const ago = t => Date.now() - t < 60000 ? dt('justNow') : dt('ago', dur(Date.now() - t));
const dt = (k, ...a) => { const v = DOC_TEXT[dLang]?.[k] ?? DOC_TEXT.en[k] ?? k; return typeof v === 'function' ? v(...a) : v; };
const dnum = s => dLang === 'en' ? s : String(s).replace(/(\d)\.(\d)/g, '$1' + dt('dec') + '$2');
const showT = c => dnum(S.settings.unit === 'F' ? (c * 9 / 5 + 32).toFixed(1) + '°F' : (+c).toFixed(1) + '°C');
const isWet = e => e.type === 'diaper' && (e.kind === 'Wet' || e.kind === 'Both');
function alerts(es, ep) {
  const out = [], now = Date.now(), c = childOf(ep);
  const temps = es.filter(e => e.type === 'temp'), fevers = temps.filter(e => e.tempC >= FEVER_C);
  if (fevers.length) {
    const first = Math.min(...fevers.map(e => e.t)), last = Math.max(...fevers.map(e => e.t));
    if (last - first >= 3 * DAY) out.push(`Fever has come and gone for more than 3 days (since ${fmtDay(first)}).`);
    const m = ageMonths(c); if (m != null && m < 3) out.push('Babies under 3 months with a temperature of 38°C (100.4°F) or more should be seen by a doctor promptly.');
  }
  if (temps.some(e => e.tempC >= 40 && now - e.t < DAY)) out.push(`Temperature reached ${showT(40)} or higher in the last 24 hours.`);
  if (!ep.end && es.some(e => e.type === 'diaper')) { const w = es.find(isWet), lastWet = w ? w.t : ep.start; if (now - lastWet > 8 * H) out.push(`No wet diaper or pee logged for ${dur(now - lastWet)}. Check whether one was missed.`); }
  if (es.filter(e => e.type === 'vomit' && now - e.t < 6 * H).length >= 3) out.push('Vomited 3 or more times in the last 6 hours.');
  const worrying = ['Fast breathing', 'Very sleepy / floppy', 'Not drinking', 'Wheezing'];
  const seen = new Set(es.filter(e => e.type === 'symptom' && now - e.t < DAY).flatMap(e => e.symptoms || []).filter(s => worrying.includes(s)));
  if (seen.size) out.push(`You noted: ${lc([...seen].join(', '))} in the last 24 hours.`);
  return out;
}
const medGap = name => (live(S.meds).find(m => lc(m.name) === lc(name)) || {}).gapH;
const BACKUP_DAYS = 2;
function backupDue() {
  if (S.example || !kids().length || (S.backupSnooze || 0) > Date.now()) return null;
  if (!S.backedUpAt) return 'Nothing is backed up yet. If this phone is lost or reset, the log is gone.';
  if ((S.changedAt || 0) > S.backedUpAt && Date.now() - S.backedUpAt > BACKUP_DAYS * DAY) return `Last backup ${ago(S.backedUpAt)}. Newer entries exist only on this phone.`;
  return null;
}
const fold = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
const words = s => fold(s).split(/[^\p{L}\p{N}]+/u).filter(w => w.length > 1);
function recallMatch(r, prods = live(S.products)) {
  const hay = new Set(words(r.title + ' ' + r.company));
  return prods.find(p => { const w = words(p.name); return w.length && w.every(x => hay.has(x)); }) || null;
}
const inEnglish = v => !v ? '' : typeof v === 'string' ? v : String(v.en || Object.values(v)[0] || '');
const recallCountryCodes = () => [...new Set([...RECALL_COUNTRIES.map(([k]) => k), ...(S.recalls?.items || []).map(r => r.country).filter(Boolean)])];
const tracksCountry = c => !Array.isArray(S.settings.recallCountries) || S.settings.recallCountries.includes(c);
const recallList = () => (S.recalls?.items || []).filter(r => tracksCountry(r.country));
const recallNew = () => { const seen = new Set(S.recalls?.feedSeen || []), from = Date.now() - 30 * DAY; return recallList().filter(r => r.date >= from && !seen.has(r.id)); };
const recallAlerts = () => { const seen = new Set(S.recalls?.seen || []); return recallList().map(r => ({ r, p: recallMatch(r) })).filter(x => x.p && !seen.has(x.r.id)); };
