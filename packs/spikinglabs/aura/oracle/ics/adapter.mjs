import { serve, build, clock, at } from './common.mjs';

const loc = { href: '' };
const api = build(`let S = null;`, `return { icsText, icsName, googleCalUrl };`, { location: loc });

await serve(i => {
  clock.t = at(i.now);
  loc.href = i.href;
  const evs = i.events.map(e => ({ uid: e.uid, t: at(e.at), time: e.time ?? '', title: e.title, details: e.details, ...(e.location ? { location: e.location } : {}), ...(e.booked ? { booked: true } : {}) }));
  return { ics: api.icsText(evs), filename: api.icsName(evs), google_url: evs.length === 1 ? api.googleCalUrl(evs[0]) : null };
});
