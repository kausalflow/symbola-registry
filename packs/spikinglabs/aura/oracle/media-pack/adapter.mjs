import { serve, build, SpecError } from './common.mjs';

// Drive's backups/media folder is a map from file name to bytes.
const api = build(`let S = null; let folder = null, uploads = [];
  const mediaDirStub = async () => mediaHome || (mediaHome = { dir: 'media', have: new Map([...folder.keys()].map(n => [n, n])) });
  const uploadBlob = async (tok, name, parent, type, bytes) => { uploads.push({ name, type, bytes_b64: Buffer.from(bytes).toString('base64') }); folder.set(name, bytes); return name; };
  const gapi = async (tok, url) => { const id = decodeURIComponent(url.slice(DRIVE.length + 1).split('?')[0]); return { arrayBuffer: async () => folder.get(id) }; };`,
  `const mediaDir = mediaDirStub;
  return { async pack(d, files) { folder = new Map(files.map(n => [n, new Uint8Array()])); mediaHome = null; uploads = []; const data = await packMedia('tok', d); return { data, uploads }; },
    async unpack(d, files) { folder = new Map(Object.entries(files).map(([n, b]) => [n, new Uint8Array(Buffer.from(b, 'base64'))])); mediaHome = null; return unpackMedia('tok', d); } };`);

await serve(async i => {
  switch (i.op) {
    case 'pack': return await api.pack(structuredClone(i.data), i.existing ?? []);
    case 'unpack': { const r = await api.unpack(structuredClone(i.data), i.media ?? {}); return { data: r.d, missing: r.missing }; }
    default: throw new SpecError('unknown op ' + i.op);
  }
});
