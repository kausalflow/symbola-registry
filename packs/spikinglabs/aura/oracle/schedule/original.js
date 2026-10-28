// Verbatim from Aura's src/app.html (declarations: reEsc, H, pad, toLocalInput, startOfDay, lc, live, kids, kid, fmtTime, fmtDate, atMonths, apptsOf, apptKs, apptDose, apptFor, apptT, apptWhen, apptState, apptSoon, VAX_PLAN, VAX_MORE, VAX_KINDS, vaxLabel, vaxOf, vaxDoses, planOn, ageMonths, vaxStatus, vaxOpen, lifeAt, span, lastDay, U_PLAN, uPlanOn, uOf, uExams, uStatus, planStatus, uOpen, Z_PLAN, zPlanOn, zExams, zStatus, zOpen, oneLine, appLink, eventText, bookedEvent, vaxGot, vaxApptKs, vaxApptOpen, vaxApptNames, vaxApptEvent, uEvent, vaxEvent, zEvent, otherAppts, upcoming, otherEvent, nextEvents).
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const H = 3600e3, DAY = 24 * H;
const pad = n => String(n).padStart(2, '0');
const toLocalInput = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const startOfDay = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const lc = s => String(s || '').toLowerCase();
const live = a => a.filter(x => !x.deleted);
const kids = () => live(S.children);
const kid = () => kids().find(c => c.id === S.child) || kids()[0] || null;
const fmtTime = t => new Date(t).toLocaleTimeString(dLocale(), { hour: '2-digit', minute: '2-digit' });
const fmtDate = t => new Date(t).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
function atMonths(dob, m) { const d = new Date(dob + 'T12:00'); if (m % 1) return d.getTime() + m * 30.44 * DAY; const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + m); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return d.getTime(); }
const apptsOf = c => live(S.appts || []).filter(a => a.childId === c.id);
const apptKs = a => a.ks || [a.k];
const apptDose = (a, k) => a.doses ? a.doses[k] : a.dose;
const apptFor = (c, plan, k, dose) => apptsOf(c).filter(a => a.plan === plan && (plan === 'vax' ? apptKs(a).includes(k) && apptDose(a, k) === dose : a.k === k)).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0] || null;
const apptT = a => new Date(a.date + 'T' + (a.time || '12:00')).getTime();
const apptWhen = a => { const t = apptT(a), d = startOfDay(t), today = startOfDay(Date.now());
  return (d === today ? 'today' : d === today + DAY ? 'tomorrow' : fmtDate(t)) + (a.time ? ', ' + fmtTime(t) : ''); };
function apptState(a) {
  const past = startOfDay(apptT(a)) < startOfDay(Date.now());
  return { appt: a, st: past ? 'went' : 'booked', text: past ? `Appointment was ${apptWhen(a)} · record it` : `Appointment ${apptWhen(a)}` };
}
const apptSoon = s => s.st === 'went' || (s.st === 'booked' && apptT(s.appt) < startOfDay(Date.now()) + 15 * DAY);
const VAX_PLAN = [
  { k: 'rsv', l: 'RSV protection (antibody)', s: 'RSV antibody', at: [0], ages: ['before or in the first RSV season'], upto: 12, until: 12, note: 'One dose of nirsevimab. Babies born April to September get it in the autumn before their first RSV season, babies born October to March in their first days.' },
  { k: 'rota', l: 'Rotavirus', s: 'Rotavirus', at: [1.5, 2], ages: ['at 6 weeks', 'at 2 months'], until: 8, note: 'Drops by mouth from 6 weeks. Some vaccines have a third dose at 3 to 4 months. The series has to be finished by 24 to 32 weeks.' },
  { k: '6in1', l: '6-in-1 (diphtheria, tetanus, whooping cough, polio, Hib, hepatitis B)', s: '6-in-1', at: [2, 4, 11], ages: ['at 2 months', 'at 4 months', 'at 11 months'], note: 'Babies born early get an extra dose at 3 months.' },
  { k: 'pcv', l: 'Pneumococcus', s: 'Pneumococcus', at: [2, 4, 11], ages: ['at 2 months', 'at 4 months', 'at 11 months'], note: 'Babies born early get an extra dose at 3 months.' },
  { k: 'menb', l: 'Meningococcus B', s: 'Meningococcus B', at: [2, 4, 12], ages: ['at 2 months', 'at 4 months', 'at 12 months'], note: 'Missed doses can be caught up until the 5th birthday, with a different number of doses.' },
  { k: 'mmr', l: 'Measles, mumps, rubella (MMR)', s: 'MMR', at: [11, 15], ages: ['at 11 months', 'at 15 months'], note: 'Often given together with chickenpox as one shot (MMRV). Daycare and school ask for proof of measles vaccination.' },
  { k: 'var', l: 'Chickenpox (varicella)', s: 'Chickenpox', at: [11, 15], ages: ['at 11 months', 'at 15 months'], note: 'Often given together with MMR as one shot (MMRV).' },
  { k: 'tdap', l: 'Booster: tetanus, diphtheria, whooping cough', s: 'Tdap booster', at: [60], ages: ['at 5 to 6 years'], upto: 84 },
  { k: 'tdapipv', l: 'Booster: tetanus, diphtheria, whooping cough, polio', s: 'Tdap-polio booster', at: [108], ages: ['at 9 to 16 years'], upto: 204 },
  { k: 'hpv', l: 'HPV', s: 'HPV', at: [108, 113], ages: ['at 9 to 14 years', 'at least 5 months after the first'], upto: 180, note: 'Two doses between 9 and 14 years; started later, three doses.' },
  { k: 'menacwy', l: 'Meningococcus ACWY', s: 'Meningococcus ACWY', at: [144], ages: ['at 12 to 14 years'], upto: 180, note: 'Catch-up is possible up to 24 years.' }];
const VAX_MORE = [['menc', 'Meningococcus C'], ['flu', 'Flu'], ['covid', 'COVID-19'], ['fsme', 'TBE (FSME)'], ['hepa', 'Hepatitis A'], ['hepb', 'Hepatitis B'], ['polio', 'Polio'],
  ['typhoid', 'Typhoid'], ['rabies', 'Rabies'], ['yellow', 'Yellow fever'], ['je', 'Japanese encephalitis'], ['cholera', 'Cholera'], ['other', 'Other']];
const VAX_KINDS = [...VAX_PLAN.map(v => [v.k, v.s]), ...VAX_MORE];
const vaxLabel = k => (VAX_KINDS.find(([x]) => x === k) || [, k])[1];
const vaxOf = c => live(S.vaccines || []).filter(v => v.childId === c.id);
const vaxDoses = c => vaxOf(c).filter(v => v.kind === 'dose').sort((a, b) => b.t - a.t);
const planOn = () => S.settings.vaxPlan !== 'none';
const ageMonths = c => c?.dob ? (Date.now() - new Date(c.dob)) / (30.44 * DAY) : null;
function vaxStatus(c, v) {
  const given = vaxDoses(c).filter(d => (d.against || []).includes(v.k)).reverse(), n = given.length, of = v.at.length;
  const dose = of > 1 ? `Dose ${Math.min(n + 1, of)} of ${of} · ` : '', base = { given, n, of };
  if ((c.vaxSkip || []).includes(v.k)) return { ...base, st: 'skip', text: n ? `${n} recorded · not planned` : 'Not planned' };
  if (n >= of) return { ...base, st: 'done', text: `Done · ${fmtDate(given[n - 1].t)}` };
  const a = apptFor(c, 'vax', v.k, n + 1); if (a) { const x = apptState(a); return { ...base, ...x, text: dose + x.text }; }
  const m = ageMonths(c), due = v.at[n];
  if (m == null) return { ...base, st: 'open', text: dose + 'usually ' + v.ages[n] };
  if (v.until != null && m > v.until) return { ...base, st: 'missed', text: `The usual age is over${n ? ` · ${n} of ${of} recorded` : ''}` };
  if (m > (v.upto ?? due + 2)) return { ...base, st: 'late', text: `${dose}not recorded yet · usually ${v.ages[n]}` };
  if (m >= due - 0.5) return { ...base, st: 'due', text: `${dose}due · ${v.ages[n]}` };
  return { ...base, st: 'later', text: `${dose}from ${fmtDate(atMonths(c.dob, due))} · ${v.ages[n]}` };
}
const vaxOpen = c => planOn() && c?.dob ? VAX_PLAN.filter(v => ['due', 'late'].includes(vaxStatus(c, v).st)) : [];
function lifeAt(dob, n, u, end) {
  const k = end ? n : n - 1, b = startOfDay(new Date(dob + 'T12:00').getTime());
  return u === 'd' ? b + k * DAY : u === 'w' ? b + k * 7 * DAY : startOfDay(atMonths(dob, k * (u === 'y' ? 12 : 1)));
}
const span = (dob, [a, b, u]) => [lifeAt(dob, a, u), lifeAt(dob, b, u, true)];
const lastDay = t => t - DAY / 2;
const U_PLAN = [
  { k: 'U1', at: [1, 1, 'd'], win: [1, 1, 'd'], ages: 'right after birth', note: 'Usually done in the hospital or by the midwife.' },
  { k: 'U2', at: [3, 10, 'd'], win: [3, 14, 'd'], ages: 'day 3 to 10', note: 'Often still in the hospital, otherwise at the practice.' },
  { k: 'U3', at: [4, 5, 'w'], win: [3, 8, 'w'], ages: 'week 4 to 5' },
  { k: 'U4', at: [3, 4, 'm'], win: [2, 4.5, 'm'], ages: 'month 3 to 4' },
  { k: 'U5', at: [6, 7, 'm'], win: [5, 8, 'm'], ages: 'month 6 to 7' },
  { k: 'U6', at: [10, 12, 'm'], win: [9, 14, 'm'], ages: 'month 10 to 12' },
  { k: 'U7', at: [21, 24, 'm'], win: [20, 27, 'm'], ages: 'month 21 to 24' },
  { k: 'U7a', at: [34, 36, 'm'], win: [33, 38, 'm'], ages: 'month 34 to 36' },
  { k: 'U8', at: [46, 48, 'm'], win: [43, 50, 'm'], ages: 'month 46 to 48' },
  { k: 'U9', at: [60, 64, 'm'], win: [58, 66, 'm'], ages: 'month 60 to 64' },
  { k: 'U10', at: [10, 11, 'y'], win: [10, 11, 'y'], ages: 'at 9 to 10 years', note: 'New in the U-Heft from 2027. Some health insurers already pay for it; ask yours.' },
  { k: 'J1', at: [13, 14, 'y'], win: [13, 15, 'y'], ages: 'at 12 to 14 years', note: 'The teenage checkup. It can be done until the 15th birthday.' }];
const uPlanOn = () => S.settings.uPlan !== 'none';
const uOf = c => live(S.checkups || []).filter(x => x.childId === c.id);
const uExams = c => uOf(c).filter(x => x.kind === 'exam').sort((a, b) => b.t - a.t);
const uStatus = (c, u) => planStatus(c, u, uExams(c).filter(e => e.u === u.k), 'u');
function planStatus(c, u, given, plan) {
  const base = { given };
  if (c.dob) { const [as, ae] = span(c.dob, u.at), [ws, we] = span(c.dob, u.win); Object.assign(base, { as, ae, ws, we, best: u.k === 'U1' ? u.ages : `${fmtDate(as)} to ${fmtDate(lastDay(ae))}` }); }
  if (given.length) return { ...base, st: 'done', text: `Done · ${fmtDate(given[0].t)}` };
  const a = apptFor(c, plan, u.k); if (a) return { ...base, ...apptState(a) };
  if (!c.dob) return { ...base, st: 'open', text: 'Usually ' + u.ages };
  const now = Date.now(), { as, ws, we, best } = base;
  if (now >= we) return { ...base, st: 'missed', text: `Not recorded · possible until ${fmtDate(lastDay(we))}` };
  if (now >= ws) return { ...base, st: 'due', text: `Due · until ${fmtDate(lastDay(we))}${now < as ? ' · usual time ' + best : ''}` };
  if (now >= ws - 28 * DAY) return { ...base, st: 'soon', text: `Time to book · from ${fmtDate(ws)} · usual time ${best}` };
  return { ...base, st: 'later', text: `${best} · ${u.ages}` };
}
const uOpen = c => uPlanOn() && c ? U_PLAN.filter(u => { const s = uStatus(c, u); return ['due', 'soon'].includes(s.st) || apptSoon(s); }) : [];
const Z_PLAN = [
  { k: 'Z1', at: [6, 9, 'm'], win: [6, 9, 'm'], ages: 'month 6 to 9', note: 'The first visit, usually around the first tooth. The dentist also shows how to brush baby teeth.' },
  { k: 'Z2', at: [10, 20, 'm'], win: [10, 20, 'm'], ages: 'month 10 to 20' },
  { k: 'Z3', at: [21, 33, 'm'], win: [21, 33, 'm'], ages: 'month 21 to 33' },
  { k: 'Z4', at: [34, 48, 'm'], win: [34, 48, 'm'], ages: 'month 34 to 48' },
  { k: 'Z5', at: [49, 60, 'm'], win: [49, 60, 'm'], ages: 'month 49 to 60' },
  { k: 'Z6', at: [61, 72, 'm'], win: [61, 72, 'm'], ages: 'month 61 to 72', note: 'The last of these checkups. From 6 years the dentist checks the teeth every half year.' }];
const zPlanOn = () => S.settings.zPlan !== 'none';
const zExams = c => live(S.dental || []).filter(x => x.childId === c.id).sort((a, b) => b.t - a.t);
const zStatus = (c, z) => planStatus(c, z, zExams(c).filter(e => e.z === z.k), 'z');
const zOpen = c => zPlanOn() && c ? Z_PLAN.filter(z => { const s = zStatus(c, z); return ['due', 'soon'].includes(s.st) || apptSoon(s); }) : [];
const oneLine = t => String(t || '').trim().split(/\s*\n+\s*/).join('; ').replace(/[.;,\s]+$/, '');
const appLink = () => location.href.split(/[?#]/)[0] + '?open=appts';
const eventText = (head, a, o) => [head, [a.place && `📍 ${a.place}`, a.note && `📝 ${a.note}`].filter(Boolean).join('\n'),
  o.bring?.length ? 'Bring:\n' + o.bring.map(x => `• ${x}`).join('\n') : '', o.about, `Open in Aura: ${appLink()}`].filter(Boolean).join('\n\n');
const bookedEvent = (s, uid, what, c, o) => ({ uid, t: apptT(s.appt), time: s.appt.time || '', booked: true, location: s.appt.place || '',
  title: `${o.emoji} ${o.title || what[0].toUpperCase() + what.slice(1)} · ${c.name}`, details: eventText(`${c.name}'s ${what} appointment`, s.appt, o) });
const vaxGot = (c, a, k) => { const d = apptDose(a, k), got = vaxDoses(c).filter(x => (x.against || []).includes(k));
  return d ? got.length >= d : got.some(x => x.t >= startOfDay(apptT(a)) - 14 * DAY); };
const vaxApptKs = (c, a) => apptKs(a).filter(k => !vaxGot(c, a, k));
const vaxApptOpen = c => apptsOf(c).filter(a => a.plan === 'vax' && vaxApptKs(c, a).length).sort((a, b) => apptT(a) - apptT(b));
const vaxApptNames = (c, a) => vaxApptKs(c, a).map(vaxLabel).join(', ');
const vaxApptEvent = (c, a) => bookedEvent({ appt: a }, `${c.id}-appt-${a.id}`, 'vaccination', c, { emoji: '💉', title: `Vaccination: ${vaxApptNames(c, a)}`,
  about: 'Vaccinations:\n' + vaxApptKs(c, a).map(k => { const v = VAX_PLAN.find(x => x.k === k), d = apptDose(a, k);
    return `• ${v ? v.l : vaxLabel(k)}${v && d && v.at.length > 1 ? `, dose ${d} of ${v.at.length}` : ''}`; }).join('\n'),
  bring: ['Vaccination book', 'Health insurance card'] });
function uEvent(c, u) {
  const s = uStatus(c, u);
  if (s.st === 'booked') return bookedEvent(s, `${c.id}-${u.k}`, `${u.k} checkup`, c, { emoji: '🩺', bring: ['U-Heft', 'Vaccination book', 'Health insurance card'],
    about: `The ${u.k} checkup is usually ${u.ages}${s.ws && u.k !== 'U1' ? `; it can be done until ${fmtDate(lastDay(s.we))}` : ''}.` });
  if (!['due', 'soon', 'later'].includes(s.st)) return null;
  return { uid: `${c.id}-${u.k}`, t: Math.max(s.as, startOfDay(Date.now())), title: `${u.k} checkup · ${c.name}`,
    details: `${u.k} checkup (U-Heft), usually ${u.k === 'U1' ? u.ages : u.ages + ': ' + s.best}. It can be done from ${fmtDate(s.ws)} until ${fmtDate(lastDay(s.we))}. Book it with your pediatrician and bring the U-Heft and the vaccination book. From Aura.` };
}
function vaxEvent(c, v) {
  const s = vaxStatus(c, v);
  if (s.st === 'booked') return vaxApptEvent(c, s.appt);
  if (!c.dob || !['due', 'late', 'later'].includes(s.st)) return null;
  return { uid: `${c.id}-vax-${v.k}-${s.n + 1}`, t: Math.max(startOfDay(atMonths(c.dob, v.at[s.n])), startOfDay(Date.now())), title: `${v.s} vaccination · ${c.name}`,
    details: `${v.l}${s.of > 1 ? `, dose ${s.n + 1} of ${s.of}` : ''}: usually ${v.ages[s.n]}, as in the STIKO schedule. Your pediatrician decides what your child gets and when. Bring the vaccination book. From Aura.` };
}
function zEvent(c, z) {
  const s = zStatus(c, z);
  if (s.st === 'booked') return bookedEvent(s, `${c.id}-${z.k}`, `${z.k} dental checkup`, c, { emoji: '🦷', bring: ['Dental pass or U-Heft', 'Health insurance card'],
    about: `The ${z.k} dental checkup is in ${z.ages} of life${s.we ? `; it can be done until ${fmtDate(lastDay(s.we))}` : ''}.` });
  if (!['due', 'soon', 'later'].includes(s.st)) return null;
  return { uid: `${c.id}-${z.k}`, t: Math.max(s.ws, startOfDay(Date.now())), title: `${z.k} dental checkup · ${c.name}`,
    details: `${z.k} dental checkup, ${z.ages}: from ${fmtDate(s.ws)} until ${fmtDate(lastDay(s.we))}. Book it with a dentist for children and bring the dental pass or the U-Heft. From Aura.` };
}
const otherAppts = c => apptsOf(c).filter(a => a.plan === 'other').sort((a, b) => apptT(a) - apptT(b));
const upcoming = a => startOfDay(apptT(a)) >= startOfDay(Date.now());
const otherEvent = (c, a) => ({ uid: `${c.id}-appt-${a.id}`, t: apptT(a), time: a.time || '', booked: true, title: `📅 ${a.title} · ${c.name}`, location: a.place || '',
  details: eventText(`${c.name}: ${a.title}`, a, { bring: linkedDoc(a) ? [docTitle(linkedDoc(a)), 'Health insurance card'] : ['Health insurance card'] }) });
const nextEvents = c => [...(uPlanOn() ? U_PLAN.map(u => uEvent(c, u)) : []), ...(zPlanOn() ? Z_PLAN.map(z => zEvent(c, z)) : []), ...(planOn() ? VAX_PLAN.filter(v => !(c.vaxSkip || []).includes(v.k)).map(v => vaxEvent(c, v)) : []),
  ...vaxApptOpen(c).filter(a => apptState(a).st === 'booked').map(a => vaxApptEvent(c, a)), ...otherAppts(c).filter(upcoming).map(a => otherEvent(c, a))]
  .filter((e, i, all) => e && e.t < Date.now() + 365 * DAY && all.findIndex(x => x?.uid === e.uid) === i).sort((a, b) => a.t - b.t);
