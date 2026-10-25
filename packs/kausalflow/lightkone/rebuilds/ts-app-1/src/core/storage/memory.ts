// Files in memory: for tests, and the base for read-only wrappers.
import type { Access, StorageAdapter } from "./adapter.ts";
import { toBytes } from "./adapter.ts";

export class MemoryStorage implements StorageAdapter {
  readonly label = "Memory";
  files = new Map<string, Uint8Array>();
  writes: string[] = [];

  constructor(private mode: Access = "write") {}

  async read(path: string) {
    return this.files.get(path) ?? null;
  }
  async write(path: string, data: Uint8Array | string) {
    if (this.mode === "read") throw new Error("read-only");
    this.files.set(path, toBytes(data));
    this.writes.push(path);
  }
  async list(prefix: string) {
    return [...this.files.keys()].filter((k) => k.startsWith(prefix)).sort();
  }
  async remove(path: string) {
    this.files.delete(path);
  }
  async access() {
    return this.mode;
  }
}
