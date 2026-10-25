// Offline for remote storage: a copy of the library, its annotations and
// texts, and the last 25 PDFs opened are kept on this device (IndexedDB), so
// the app opens offline. Writes other than library.json wait in an outbox and
// are written on reconnect; library.json itself is saved again then (a save
// always re-reads and merges, so a queued copy would be stale).
import type { StorageAdapter } from "../core/storage/adapter.ts";
import { StorageError, toBytes } from "../core/storage/adapter.ts";
import { LIBRARY_JSON } from "../core/types.ts";

const DB = "lightkone-offline";
const KEEP_PDFS = 25;

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("cache");
      req.result.createObjectStore("outbox");
      req.result.createObjectStore("meta");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function op<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise<T>((resolve, reject) => {
    const t = d.transaction(store, mode);
    const r = fn(t.objectStore(store));
    t.oncomplete = () => {
      d.close();
      resolve(r.result);
    };
    t.onerror = () => {
      d.close();
      reject(t.error);
    };
  });
}

export class OfflineError extends StorageError {
  constructor(message = "Offline") {
    super(message, 0);
    this.name = "OfflineError";
  }
}

function isNetworkError(e: unknown): boolean {
  if (!navigator.onLine) return true;
  return e instanceof TypeError || (e instanceof StorageError && e.status === 0);
}

const cacheable = (path: string) =>
  path === LIBRARY_JSON || path.startsWith("lightkone/annotations/") || path.startsWith("lightkone/text/") || path.startsWith("lightkone/pages/");

interface Queued {
  data: ArrayBuffer;
  contentType: string;
}

/** Wraps a remote storage with the device's copy and outbox. Keys are prefixed by the storage label. */
export class OfflineStorage implements StorageAdapter {
  readonly label: string;
  /** PDFs kept on this device, most recently opened last. */
  private pdfs: string[] = [];
  onOffline?: () => void;

  constructor(private inner: StorageAdapter, private scope: string) {
    this.label = inner.label;
  }

  private k(path: string) {
    return `${this.scope}|${path}`;
  }

  async init(): Promise<void> {
    this.pdfs = ((await op("meta", "readonly", (s) => s.get(this.k("pdfs")))) as string[] | undefined) ?? [];
  }

  isKept(path: string | undefined): boolean {
    return Boolean(path && this.pdfs.includes(path));
  }

  /** Keeps a PDF on the device; the oldest beyond 25 is let go. */
  async keepPdf(path: string, bytes: Uint8Array): Promise<void> {
    this.pdfs = [...this.pdfs.filter((p) => p !== path), path];
    const drop = this.pdfs.splice(0, Math.max(0, this.pdfs.length - KEEP_PDFS));
    await op("cache", "readwrite", (s) => s.put(bytes.slice().buffer, this.k(path)));
    for (const d of drop) await op("cache", "readwrite", (s) => s.delete(this.k(d)));
    await op("meta", "readwrite", (s) => s.put(this.pdfs, this.k("pdfs")));
  }

  private async cached(path: string): Promise<Uint8Array | null> {
    const queued = (await op("outbox", "readonly", (s) => s.get(this.k(path)))) as Queued | undefined;
    if (queued) return new Uint8Array(queued.data);
    const v = (await op("cache", "readonly", (s) => s.get(this.k(path)))) as ArrayBuffer | undefined;
    return v ? new Uint8Array(v) : null;
  }

  async read(path: string): Promise<Uint8Array | null> {
    try {
      const bytes = await this.inner.read(path);
      if (bytes && cacheable(path)) await op("cache", "readwrite", (s) => s.put(bytes.slice().buffer, this.k(path)));
      // A queued write is newer than what is stored.
      const queued = path === LIBRARY_JSON ? undefined : ((await op("outbox", "readonly", (s) => s.get(this.k(path)))) as Queued | undefined);
      return queued ? new Uint8Array(queued.data) : bytes;
    } catch (e) {
      if (!isNetworkError(e)) throw e;
      this.onOffline?.();
      const hit = await this.cached(path);
      if (hit) return hit;
      if (path === LIBRARY_JSON) throw new OfflineError("Offline, and this device has no copy of the library yet.");
      throw new OfflineError(`Offline: ${path} is not kept on this device.`);
    }
  }

  async write(path: string, data: Uint8Array | string, contentType: string): Promise<void> {
    const bytes = toBytes(data);
    try {
      await this.inner.write(path, bytes, contentType);
      if (cacheable(path)) await op("cache", "readwrite", (s) => s.put(bytes.slice().buffer, this.k(path)));
    } catch (e) {
      if (!isNetworkError(e)) throw e;
      this.onOffline?.();
      if (path === LIBRARY_JSON || path === "lightkone/library.bib") throw new OfflineError();
      await op("outbox", "readwrite", (s) => s.put({ data: bytes.slice().buffer, contentType } satisfies Queued, this.k(path)));
    }
  }

  async pending(): Promise<string[]> {
    const keys = (await op("outbox", "readonly", (s) => s.getAllKeys())) as string[];
    return keys.filter((k) => k.startsWith(this.scope + "|")).map((k) => k.slice(this.scope.length + 1));
  }

  /** Writes what waited in the outbox. `before` may merge with what is stored (annotations). */
  async flush(before?: (path: string, ours: Uint8Array) => Promise<Uint8Array>): Promise<number> {
    let n = 0;
    for (const path of await this.pending()) {
      const q = (await op("outbox", "readonly", (s) => s.get(this.k(path)))) as Queued;
      let bytes: Uint8Array = new Uint8Array(q.data);
      if (before) bytes = await before(path, bytes);
      await this.inner.write(path, bytes, q.contentType);
      await op("outbox", "readwrite", (s) => s.delete(this.k(path)));
      if (cacheable(path)) await op("cache", "readwrite", (s) => s.put(bytes.slice().buffer, this.k(path)));
      n++;
    }
    return n;
  }

  /** Reads straight from the storage, skipping the outbox (for merging on reconnect). */
  readStored(path: string) {
    return this.inner.read(path);
  }

  list(prefix: string) {
    return this.inner.list(prefix);
  }

  remove(path: string) {
    return this.inner.remove ? this.inner.remove(path) : Promise.resolve();
  }

  access() {
    return this.inner.access ? this.inner.access().catch((e) => (isNetworkError(e) ? ("write" as const) : Promise.reject(e))) : Promise.resolve("write" as const);
  }
}
