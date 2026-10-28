import { serve, build, SpecError } from './common.mjs';

// The AI service is replaced by a stub that records what it is sent and answers with the given reply.
const api = build(`let S = null, provider = 'key', sent = null, reply = null;
  const aiProvider = async () => provider;
  const apiCall = async (sys, u, schema, images) => { sent = { system: sys, user: u, images: images.length }; return reply; };
  const getSample = async () => { const f = async () => ({ text: '' }); f.json = async prompt => { sent = { system: prompt, user: '', images: 0 }; return reply; }; return f; };`,
  `return { setS: x => { S = x; }, async run(p, r, args) { provider = p; reply = r; sent = null; const out = await ai(...args); return { out, sent, shown: lastSent }; } };`);

await serve(async i => {
  const S = { settings: { me: i.me ?? '' }, children: i.children.map(c => ({ ...c })), entries: (i.entries ?? []).map((e, k) => ({ id: 'e' + k, ...e })) };
  api.setS(S);
  const provider = { 'own-key': 'key', device: 'sample', off: null }[i.provider ?? 'own-key'];
  const r = await api.run(provider, structuredClone(i.reply), [i.system, i.user, {}, i.child, Array.from({ length: i.images ?? 0 }, () => 'img')]);
  return { system: r.shown.system, user: r.shown.user, via: r.shown.via === 'key' ? 'own-key' : 'device', result: r.out };
});
