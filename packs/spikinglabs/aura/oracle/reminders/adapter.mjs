import { readFileSync } from 'node:fs';
import { serve, build, clock, at, day, SpecError } from './common.mjs';

const snippet = readFileSync(new URL('./snippet.js', import.meta.url), 'utf8');
const api = build(`let S = null, dLang = 'en';
  const DOC_LANGS = [['en', 'English', 'en', 'English']];
  const DOC_TEXT = { en: { dur: ['min', 'h', 'm', 'd'], justNow: 'just now', ago: d => d + ' ago', dec: '.' } };
  const dLocale = () => []; const tooNew = () => false;`,
  `const doseLines = (es, now) => { ${snippet}; return doses; };
  return { setS: x => { S = x; }, alerts, doseLines, backupDue, recallMatch, recallAlerts, recallNew, recallList };`);

const ent = (e, k) => ({ id: 'e' + k, child: 'c1', ...e, t: at(e.t), updatedAt: 1 });
const KIND = [[/^Fever has come and gone/, 'fever-3-days'], [/^Babies under 3 months/, 'under-3-months'], [/^Temperature reached/, 'very-high-temp'],
  [/^No wet diaper/, 'no-wet-diaper'], [/^Vomited 3 or more/, 'vomiting'], [/^You noted:/, 'worrying-symptoms']];

await serve(i => {
  if (!i.now) throw new SpecError('missing now');
  clock.t = at(i.now);
  switch (i.op) {
    case 'alerts': {
      const c = { id: 'c1', name: 'Mia', dob: i.child?.dob ?? null }, ep = { id: 'ep1', childId: 'c1', start: at(i.episode.start), ...(i.episode.end ? { end: at(i.episode.end) } : {}) };
      api.setS({ settings: { unit: i.unit ?? 'C' }, children: [c] });
      const es = i.entries.map(ent).sort((a, b) => b.t - a.t);
      return { alerts: api.alerts(es, ep).map(m => { const k = KIND.find(([re]) => re.test(m))[1]; return k === 'worrying-symptoms' ? { kind: k, symptoms: m.slice('You noted: '.length).replace(/ in the last 24 hours\.$/, '').split(', ') } : { kind: k }; }) };
    }
    case 'medicine': {
      api.setS({ settings: { unit: 'C' }, meds: i.meds.map((m, k) => ({ id: 'm' + k, updatedAt: 0, ...m })) });
      const es = i.entries.map(ent).sort((a, b) => b.t - a.t);
      const html = api.doseLines(es, clock.t);
      return { medicines: [...html.matchAll(/<div class="dose-line"><span><b>(.*?)<\/b>(.*?)<\/div>/g)].map(m => {
        const p = m[2].match(/pill (ok|wait)">(\d+(?:\.\d+)?) h gap/);
        return { name: m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'), gap: p ? (p[1] === 'ok' ? 'passed' : 'waiting') : 'none', gap_hours: p ? +p[2] : null }; }) };
    }
    case 'backup': {
      const b = i.state;
      api.setS({ example: !!b.example, children: Array.from({ length: b.children ?? 0 }, (_, k) => ({ id: 'c' + k })), backupSnooze: b.snooze ? at(b.snooze) : 0,
        ...(b.backed_up_at ? { backedUpAt: at(b.backed_up_at) } : {}), ...(b.changed_at ? { changedAt: at(b.changed_at) } : {}) });
      const m = api.backupDue();
      return { due: m == null ? null : /^Nothing is backed up/.test(m) ? 'never' : 'stale' };
    }
    case 'recall-match': {
      api.setS({ products: i.products.map((p, k) => ({ id: 'p' + k, ...p })) });
      const p = api.recallMatch(i.recall);
      return { matched: p ? p.name : null };
    }
    case 'recall-lists': {
      const items = i.recalls.map(r => ({ ...r, date: r.date ? at(r.date) : 0 }));
      api.setS({ products: i.products.map((p, k) => ({ id: 'p' + k, ...p })), settings: { recallCountries: i.countries ?? null },
        recalls: { items, seen: i.seen ?? [], feedSeen: i.feed_seen ?? [] } });
      return { new: api.recallNew().map(r => r.id), alerts: api.recallAlerts().map(x => x.r.id) };
    }
    default: throw new SpecError('unknown op ' + i.op);
  }
});
