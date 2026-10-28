import { serve, build } from './common.mjs';

const api = build(`let S = null;`, `return { migrate, logVersion, tooNew, SCHEMA };`);

await serve(i => {
  if (i.log === undefined) throw new Error('missing log');
  const log = structuredClone(i.log);
  return { schema: api.SCHEMA, too_new: api.tooNew(log), log: api.migrate(log) };
});
