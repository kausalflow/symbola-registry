import { serve, build } from './common.mjs';

const api = build(`let S = null;`, `return { setS: x => { S = x; }, getS: () => S, mergeIn, coveredBy, unknownParts, isAura, emptyState, SYNCED };`);

await serve(i => {
  switch (i.op) {
    case 'merge': {
      const S = { ...api.emptyState(), ...structuredClone(i.local) };
      for (const k of api.SYNCED) if (!(k in i.local)) S[k] = [];
      api.setS(S);
      api.mergeIn(structuredClone(i.incoming));
      const out = api.getS();
      return { result: { ...Object.fromEntries(api.SYNCED.map(k => [k, out[k]])), child: out.child, example: !!out.example } };
    }
    case 'covered': return { result: api.coveredBy(i.mine, i.theirs) };
    case 'unknown': return { result: api.unknownParts(i.log) };
    case 'is-aura': return { result: api.isAura(i.log) };
    default: throw new Error('unknown op ' + i.op);
  }
});
