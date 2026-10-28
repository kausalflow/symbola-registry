// Verbatim from Aura's src/app.html (declarations: reEsc, H, pad, toLocalInput, startOfDay, lc, live, kids, kid, ymd, hms, calSpan, googleCalUrl, icsAlarm, icsEsc, icsFold, icsText, icsName, appLink).
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const H = 3600e3, DAY = 24 * H;
const pad = n => String(n).padStart(2, '0');
const toLocalInput = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const startOfDay = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const lc = s => String(s || '').toLowerCase();
const live = a => a.filter(x => !x.deleted);
const kids = () => live(S.children);
const kid = () => kids().find(c => c.id === S.child) || kids()[0] || null;
const ymd = t => toLocalInput(t).slice(0, 10).replace(/-/g, '');
const hms = t => toLocalInput(t).replace(/[-:]/g, '') + '00';
const calSpan = e => e.time ? [hms(e.t), hms(e.t + H)] : [ymd(e.t), ymd(startOfDay(e.t) + 36 * H)];
const googleCalUrl = e => 'https://calendar.google.com/calendar/render?' + new URLSearchParams({ action: 'TEMPLATE', text: e.title, dates: calSpan(e).join('/'), details: e.details, ...(e.location ? { location: e.location } : {}) });
const icsAlarm = (e, trigger) => ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(e.title)}`, `TRIGGER:${trigger}`, 'END:VALARM'];
const icsEsc = s => String(s).replace(/[\\;,]/g, m => '\\' + m).replace(/\r?\n/g, '\\n');
function icsFold(l) {
  const out = []; let cur = '', n = 0;
  for (const ch of l) { const b = new TextEncoder().encode(ch).length; if (n + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; n = 0; } cur += ch; n += b; }
  return [...out, cur].join('\r\n ');
}
function icsText(evs) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Aura//Baby log//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    ...evs.flatMap(e => ['BEGIN:VEVENT', `UID:${e.uid}@aura`, `DTSTAMP:${stamp}`, ...(([a, b], v) => [`DTSTART${v}:${a}`, `DTEND${v}:${b}`])(calSpan(e), e.time ? '' : ';VALUE=DATE'),
      `SUMMARY:${icsEsc(e.title)}`, `DESCRIPTION:${icsEsc(e.details)}`, ...(e.location ? [`LOCATION:${icsEsc(e.location)}`] : []), ...(e.booked ? [`URL:${appLink()}`] : []),
      e.booked && e.time ? 'TRANSP:OPAQUE' : 'TRANSP:TRANSPARENT', ...(e.time ? [...icsAlarm(e, '-P1D'), ...icsAlarm(e, '-PT1H')] : icsAlarm(e, 'PT9H')), 'END:VEVENT']),
    'END:VCALENDAR'].map(icsFold).join('\r\n') + '\r\n';
}
const icsName = evs => evs.length === 1 ? `aura-${evs[0].title.split(' ·')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics` : 'aura-dates.ics';
const appLink = () => location.href.split(/[?#]/)[0] + '?open=appts';
