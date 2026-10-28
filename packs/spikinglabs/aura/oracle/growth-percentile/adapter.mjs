import { serve, build, at, SpecError } from './common.mjs';

const api = build(`let S = null;`, `return { pctOf, pctText, whoLms, whoAt, whoZ, normCdf, WHO, WHO_P, ageMo, hasCurves };`);

await serve(i => {
  const c = { sex: i.sex, dob: i.dob };
  switch (i.op) {
    case 'percentile': {
      const t = at(i.at), p = api.pctOf(c, i.measure, i.value, t);
      const lms = api.hasCurves(c) ? api.whoLms(c.sex, i.measure, api.ageMo(c, t)) : null;
      return { percentile: p, z: p == null ? null : api.whoZ(lms, i.value, i.measure), text: p == null ? null : api.pctText(p) };
    }
    case 'curve': {
      const lms = api.whoLms(i.sex, i.measure, i.months);
      return { values: lms ? api.WHO_P.map(([, z]) => api.whoAt(lms, z)) : null };
    }
    default: throw new SpecError('unknown op ' + i.op);
  }
});
