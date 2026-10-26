import { SRC, SpecError, clock, serve, b64, unb64 } from './common.mts';

await import(`${SRC}/test/setup.ts`);
const Y: any = await import(`${SRC}/node_modules/yjs/dist/yjs.mjs`);
const series = await import(`${SRC}/src/lib/series.ts`);

const local = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0);
};
const need = (i: any, ...keys: string[]) => {
  for (const k of keys) if (i[k] === undefined || i[k] === null) throw new SpecError(`missing ${k}`);
};

await serve(async (i: any) => {
  if (i.now) clock.t = Date.parse(i.now);
  switch (i.op) {
    case 'period': need(i, 'cadence', 'date'); return { result: series.periodOf(i.cadence, local(i.date)) };
    case 'base_period': need(i, 'cadence', 'occ'); return { result: series.basePeriod(i.cadence, i.occ) };
    case 'next_period': need(i, 'cadence', 'occ'); return { result: series.nextPeriod(i.cadence, i.occ) };
    case 'next_after': need(i, 'cadence', 'occ', 'occurrences'); return { result: series.nextAfter(i.cadence, i.occ, i.occurrences) };
    case 'decide': need(i, 'period', 'occurrences'); return { result: series.decide(i.occurrences, i.period) };
    case 'latest': need(i, 'occurrences'); return { result: series.latest(i.occurrences) };
    case 'label': need(i, 'cadence', 'period'); return { result: series.periodLabel(i.cadence, i.period) };
    case 'room': need(i, 'series_key', 'occ'); return { result: await series.occurrenceRoom(i.series_key, i.occ) };
    case 'ics': need(i, 'id', 'info', 'link', 'now'); return { result: series.seriesIcs(i.id, i.info, i.link, new Date(i.now)) };
    case 'document': {
      const doc = new Y.Doc();
      if (i.update) Y.applyUpdate(doc, unb64(i.update));
      else if (i.info) series.initSeries(doc, i.info);
      else throw new SpecError('give update or info');
      const ops = series.seriesOps(doc);
      for (const s of i.steps ?? []) {
        const a = s.args ?? {};
        switch (s.op) {
          case 'add_occurrence': ops.addOccurrence(a.occurrence); break;
          case 'sync_occurrence': ops.syncOccurrence(a.occ, { title: a.title, status: a.status, closedAt: a.closedAt ?? null }, a.createdAt); break;
          case 'mark_deleted': ops.markDeleted(a.occ); break;
          case 'add_facilitator': ops.addFacilitator(a.facilitator); break;
          case 'remove_facilitator': ops.removeFacilitator(a.id); break;
          case 'rename': ops.rename(a.name); break;
          default: throw new SpecError(`unknown step ${s.op}`);
        }
      }
      const read = series.readSeries(doc);
      return { result: read ? JSON.parse(JSON.stringify(read)) : null };
    }
    default: throw new SpecError(`unknown op ${i.op}`);
  }
});
