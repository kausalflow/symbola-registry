// "This browser": the library's files in IndexedDB, keyed by path.
import type { StorageAdapter, StorageProvider } from "./adapter.ts";
import { toBytes } from "./adapter.ts";

const DB = "lightkone-files";
const STORE = "files";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        t.oncomplete = () => {
          db.close();
          resolve(req.result);
        };
        t.onerror = () => {
          db.close();
          reject(t.error);
        };
      }),
  );
}

export class BrowserStorage implements StorageAdapter {
  readonly label = "This browser";

  async read(path: string): Promise<Uint8Array | null> {
    const v = await tx("readonly", (s) => s.get(path));
    return v ? new Uint8Array(v as ArrayBuffer) : null;
  }

  async write(path: string, data: Uint8Array | string): Promise<void> {
    const bytes = toBytes(data);
    const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    await tx("readwrite", (s) => s.put(copy, path));
  }

  async list(prefix: string): Promise<string[]> {
    const keys = (await tx("readonly", (s) => s.getAllKeys())) as string[];
    return keys.filter((k) => k.startsWith(prefix)).sort();
  }

  async remove(path: string): Promise<void> {
    await tx("readwrite", (s) => s.delete(path));
  }

  async access() {
    return "write" as const;
  }
}

export const browserProvider: StorageProvider = {
  id: "browser",
  label: "This browser",
  fields: [],
  create: () => new BrowserStorage(),
};
