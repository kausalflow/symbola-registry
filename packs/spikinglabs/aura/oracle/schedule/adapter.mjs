import { serve, build, clock, at, day, SpecError } from './common.mjs';

const api = build(`let S = null; const dLocale = () => []; const location = { href: 'https://example.org/aura/' }; const linkedDoc = () => null;`,
  `return { setS: x => { S = x; }, VAX_PLAN, U_PLAN, Z_PLAN, vaxStatus, uStatus, zStatus, vaxOpen, uOpen, zOpen, nextEvents, atMonths };`);

let n = 0;
const rec = (childId, extra) => r => ({ id: 'r' + n++, childId: r.childId ?? childId, t: at(r.date + 'T12:00:00Z'), updatedAt: 1, ...(r.deleted ? { deleted: true } : {}), ...extra(r) });
const dayOf = t => (t == null ? null : day(t));

function setup(i) {
  if (!i.now) throw new SpecError('missing now');
  clock.t = at(i.now);
  const cid = 'c1', c = { id: cid, name: i.child.name ?? 'Mia', dob: i.child.dob ?? null, ...(i.child.vax_skip ? { vaxSkip: i.child.vax_skip } : {}) };
  api.setS({
    settings: { vaxPlan: i.vax_plan ?? 'de', uPlan: i.u_plan ?? 'de', zPlan: i.z_plan ?? 'de' }, children: [c],
    vaccines: (i.doses ?? []).map(rec(cid, r => ({ kind: 'dose', against: r.against }))),
    checkups: (i.exams ?? []).map(rec(cid, r => ({ kind: 'exam', u: r.u }))),
    dental: (i.visits ?? []).map(rec(cid, r => ({ kind: 'exam', z: r.z }))),
    appts: (i.appts ?? []).map((a, k) => ({ id: 'a' + k, childId: cid, updatedAt: 1 + k, ...a })), docs: [], pages: [],
  });
  return c;
}

const span = (s, k) => (s[k] == null ? {} : { [k]: dayOf(s[k]) });
function item(s, k) {
  return { k, status: s.st, ...(s.appt ? { appointment: s.appt.date } : {}),
    ...(s.ws != null ? { usual_from: dayOf(s.as), usual_to: dayOf(s.ae), window_from: dayOf(s.ws), window_to: dayOf(s.we) } : {}) };
}

await serve(i => {
  const c = setup(i);
  if (i.op === 'status') {
    if (i.plan === 'vax') {
      return { items: api.VAX_PLAN.map(v => { const s = api.vaxStatus(c, v); return { k: v.k, status: s.st, doses: s.n, of: s.of, ...(s.appt ? { appointment: s.appt.date } : {}), ...(s.st === 'later' || s.st === 'due' || s.st === 'late' ? { usual_from: dayOf(api.atMonths(c.dob, v.at[s.n])) } : {}) }; }),
        open: api.vaxOpen(c).map(v => v.k) };
    }
    if (i.plan === 'u') return { items: api.U_PLAN.map(u => item(api.uStatus(c, u), u.k)), open: api.uOpen(c).map(u => u.k) };
    if (i.plan === 'z') return { items: api.Z_PLAN.map(z => item(api.zStatus(c, z), z.k)), open: api.zOpen(c).map(z => z.k) };
    throw new SpecError('unknown plan ' + i.plan);
  }
  if (i.op === 'events') return { events: api.nextEvents(c).map(e => ({ uid: e.uid, date: day(e.t), time: e.time || '', booked: !!e.booked })) };
  throw new SpecError('unknown op ' + i.op);
});
