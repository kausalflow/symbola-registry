// The storage adapter (PRODUCT.md, Interfaces). The built-in backends and
// storage plugins implement it. Paths are relative to the library's root,
// e.g. "lightkone/library.json" or "papers/All Papers/HINTON/x.pdf".

export type Access = "read" | "write";

export interface StorageAdapter {
  /** Short description for the status line, e.g. "GitHub kausalflow/papers". */
  readonly label: string;
  /** The file's bytes, or null when it does not exist. */
  read(path: string): Promise<Uint8Array | null>;
  write(path: string, data: Uint8Array | string, contentType: string): Promise<void>;
  /** Every path under prefix ("" lists everything). */
  list(prefix: string): Promise<string[]>;
  remove?(path: string): Promise<void>;
  access?(): Promise<Access>;
}

/** A field a storage provider asks for in Settings. */
export interface SettingField {
  key: string;
  label: string;
  type?: "text" | "password" | "url";
  placeholder?: string;
  optional?: boolean;
  help?: string;
}

/** A kind of storage the owner can choose (built in, or from a plugin). */
export interface StorageProvider {
  id: string;
  label: string;
  fields: SettingField[];
  /** Whether an MCP address can be made for it (it is reachable from a server). */
  remote?: boolean;
  create(config: Record<string, string>): StorageAdapter;
}

export class StorageError extends Error {
  constructor(message: string, readonly status = 0) {
    super(message);
    this.name = "StorageError";
  }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toBytes(data: Uint8Array | string): Uint8Array {
  return typeof data === "string" ? encoder.encode(data) : data;
}

export async function readText(s: StorageAdapter, path: string): Promise<string | null> {
  const bytes = await s.read(path);
  return bytes === null ? null : decoder.decode(bytes);
}

export async function readJson<T>(s: StorageAdapter, path: string): Promise<T | null> {
  const text = await readText(s, path);
  if (text === null) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** Joins an optional folder prefix and a path. */
export function joinPath(folder: string | undefined, path: string): string {
  const f = (folder ?? "").replace(/^\/+|\/+$/g, "");
  return f ? `${f}/${path}` : path;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

export function base64ToBytes(b64: string): Uint8Array {
  const s = atob(b64.replace(/\s+/g, ""));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
