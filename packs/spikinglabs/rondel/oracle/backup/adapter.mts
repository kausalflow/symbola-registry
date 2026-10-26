import { SRC, SpecError, clock, serve, unb64 } from './common.mts';

await import(`${SRC}/test/setup.ts`);
const backup = await import(`${SRC}/src/lib/backup.ts`);
const need = (i: any, ...keys: string[]) => {
  for (const k of keys) if (i[k] === undefined || i[k] === null) throw new SpecError(`missing ${k}`);
};

await serve(async (i: any) => {
  switch (i.op) {
    case 'make': {
      need(i, 'now', 'data');
      clock.t = Date.parse(i.now);
      const real = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
      (globalThis.crypto as any).getRandomValues = (a: Uint8Array) => {
        if (a.length === 16 && i.salt) return (a.set(unb64(i.salt)), a);
        if (a.length === 12 && i.iv) return (a.set(unb64(i.iv)), a);
        return real(a);
      };
      try {
        return { result: await backup.makeBackupFile(i.data, i.passphrase ?? undefined) };
      } finally {
        (globalThis.crypto as any).getRandomValues = real;
      }
    }
    case 'read': {
      need(i, 'file');
      const text = typeof i.file === 'string' ? i.file : JSON.stringify(i.file);
      return { result: await backup.readBackupFile(backup.parseBackupFile(text), i.passphrase ?? undefined) };
    }
    case 'merge': {
      need(i, 'current', 'incoming');
      const r = backup.mergeLocal(i.current, i.incoming, !!i.take_identity);
      return { result: { ...r, changes: Object.fromEntries(Object.entries(r.changes).map(([k, v]) => [k, JSON.parse(v as string)])) } };
    }
    default:
      throw new SpecError(`unknown op ${i.op}`);
  }
});
