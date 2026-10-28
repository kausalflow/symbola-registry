import { serve, build } from './common.mjs';

const api = build(`let S = null, db = null; const LS_KEY = 'aura.v2'; let toasts = [], stored = 0;
  const localStorage = { setItem() { stored++; } }; const toast = m => { toasts.push(m); };`,
  `return { reset() { savedCount = null; savedExample = false; allowShrink = false; }, step(st, shrink) { S = st; toasts = []; stored = 0; if (shrink) allowShrink = true; persist(); return { saved: stored > 0, toasts, formed: wellFormed(S) }; }, NEWER };`);

await serve(i => {
  if (!Array.isArray(i.steps)) throw new Error('missing steps');
  api.reset();
  return {
    results: i.steps.map(s => {
      const r = api.step(structuredClone(s.state), !!s.allow_shrink);
      return { saved: r.saved, refused: r.saved ? null : r.toasts[0] === api.NEWER ? 'too-new' : r.formed ? 'shrunk' : 'malformed' };
    }),
  };
});
