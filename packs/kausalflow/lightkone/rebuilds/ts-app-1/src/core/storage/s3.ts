// An S3-compatible bucket (AWS S3, Cloudflare R2, MinIO, ...). Requests are
// signed with AWS Signature V4 in the browser (WebCrypto), so the secret never
// leaves it. Works in a Worker too, for the MCP endpoint.
import type { StorageAdapter, StorageProvider } from "./adapter.ts";
import { StorageError, joinPath, toBytes } from "./adapter.ts";

export interface S3Config {
  endpoint: string;
  bucket: string;
  region?: string;
  folder?: string;
  accessKey: string;
  secretKey: string;
}

const enc = new TextEncoder();

async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", toBytes(data) as BufferSource);
  return hex(new Uint8Array(buf));
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(key: Uint8Array | string, data: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", toBytes(key) as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}

/** RFC 3986 encoding as SigV4 wants it; "/" kept when encoding a key. */
function uriEncode(s: string, keepSlash: boolean): string {
  let out = "";
  for (const byte of enc.encode(s)) {
    const c = String.fromCharCode(byte);
    if (/[A-Za-z0-9\-._~]/.test(c) || (keepSlash && c === "/")) out += c;
    else out += "%" + byte.toString(16).toUpperCase().padStart(2, "0");
  }
  return out;
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

function canonicalQuery(query: Record<string, string>): string {
  return Object.keys(query)
    .sort()
    .map((k) => `${uriEncode(k, false)}=${uriEncode(query[k], false)}`)
    .join("&");
}

export interface SignInput {
  method: string;
  host: string;
  /** The canonical (already encoded) path. */
  path: string;
  query: Record<string, string>;
  /** Lower-case names; host and x-amz-date are added. */
  headers: Record<string, string>;
  payloadHash: string;
  accessKey: string;
  secretKey: string;
  region: string;
  service?: string;
  date: Date;
}

/** AWS Signature V4: the headers to send, with authorization (host is signed but not returned). */
export async function signV4(i: SignInput): Promise<Record<string, string>> {
  const amzDate = i.date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const day = amzDate.slice(0, 8);
  const service = i.service ?? "s3";
  const all: Record<string, string> = { ...i.headers, host: i.host, "x-amz-date": amzDate };
  const names = Object.keys(all).sort();
  const canonical = [
    i.method,
    i.path,
    canonicalQuery(i.query),
    names.map((n) => `${n}:${all[n].trim().replace(/\s+/g, " ")}\n`).join(""),
    names.join(";"),
    i.payloadHash,
  ].join("\n");
  const scope = `${day}/${i.region}/${service}/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, await sha256Hex(canonical)].join("\n");
  let k = await hmac("AWS4" + i.secretKey, day);
  k = await hmac(k, i.region);
  k = await hmac(k, service);
  k = await hmac(k, "aws4_request");
  const signature = hex(await hmac(k, toSign));
  const out: Record<string, string> = { ...all };
  delete out.host;
  out.authorization = `AWS4-HMAC-SHA256 Credential=${i.accessKey}/${scope}, SignedHeaders=${names.join(";")}, Signature=${signature}`;
  return out;
}

export class S3Storage implements StorageAdapter {
  readonly label: string;
  private base: URL;

  constructor(private config: S3Config) {
    if (!config.endpoint || !config.bucket || !config.accessKey || !config.secretKey) {
      throw new StorageError("The bucket needs an endpoint, a bucket name, an access key and a secret.");
    }
    const endpoint = /^https?:\/\//.test(config.endpoint) ? config.endpoint : `https://${config.endpoint}`;
    this.base = new URL(endpoint.replace(/\/+$/, "") + "/");
    this.label = `Bucket ${config.bucket}${config.folder ? "/" + config.folder.replace(/^\/+|\/+$/g, "") : ""}`;
  }

  private get region() {
    return this.config.region || "auto";
  }

  private async request(method: string, key: string, query: Record<string, string> = {}, body?: Uint8Array, contentType?: string) {
    const path = `/${uriEncode(this.config.bucket, false)}${key ? "/" + uriEncode(key, true) : ""}`;
    const canonicalUri = this.base.pathname.replace(/\/$/, "") + path;
    const payloadHash = await sha256Hex(body ?? new Uint8Array());
    const headers: Record<string, string> = { "x-amz-content-sha256": payloadHash };
    if (contentType) headers["content-type"] = contentType;
    const signed = await signV4({
      method,
      host: this.base.host,
      path: canonicalUri,
      query,
      headers,
      payloadHash,
      accessKey: this.config.accessKey,
      secretKey: this.config.secretKey,
      region: this.region,
      date: new Date(),
    });
    const qs = canonicalQuery(query);
    const url = `${this.base.origin}${canonicalUri}${qs ? "?" + qs : ""}`;
    try {
      return await fetch(url, { method, headers: signed, body: body as BodyInit | undefined, cache: "no-store" });
    } catch (e) {
      throw new StorageError(`Cannot reach the bucket (${(e as Error).message}). Check the endpoint and the bucket's CORS rules.`);
    }
  }

  private key(path: string) {
    return joinPath(this.config.folder, path);
  }

  async read(path: string): Promise<Uint8Array | null> {
    const res = await this.request("GET", this.key(path));
    if (res.status === 404) return null;
    if (!res.ok) throw new StorageError(`Bucket read of ${path} failed: ${res.status}`, res.status);
    return new Uint8Array(await res.arrayBuffer());
  }

  async write(path: string, data: Uint8Array | string, contentType: string): Promise<void> {
    const res = await this.request("PUT", this.key(path), {}, toBytes(data), contentType);
    if (!res.ok) throw new StorageError(`Bucket write of ${path} failed: ${res.status}`, res.status);
  }

  async list(prefix: string): Promise<string[]> {
    const full = this.key(prefix);
    const strip = this.key("").length;
    const out: string[] = [];
    let token: string | undefined;
    do {
      const q: Record<string, string> = { "list-type": "2", prefix: full };
      if (token) q["continuation-token"] = token;
      const res = await this.request("GET", "", q);
      if (!res.ok) throw new StorageError(`Bucket list failed: ${res.status}`, res.status);
      const xml = await res.text();
      for (const m of xml.matchAll(/<Key>([\s\S]*?)<\/Key>/g)) out.push(decodeXml(m[1]).slice(strip));
      const truncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
      token = truncated ? decodeXml(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/.exec(xml)?.[1] ?? "") : undefined;
    } while (token);
    return out;
  }

  async remove(path: string): Promise<void> {
    const res = await this.request("DELETE", this.key(path));
    if (!res.ok && res.status !== 404) throw new StorageError(`Bucket delete of ${path} failed: ${res.status}`, res.status);
  }

  async access(): Promise<"read" | "write"> {
    // A bucket gives no cheap way to ask; a read that works is enough to open.
    const res = await this.request("GET", "", { "list-type": "2", "max-keys": "1", prefix: this.key("lightkone/") });
    if (res.status === 403 || res.status === 401) throw new StorageError("The bucket refused the key: check the access key and secret.", res.status);
    if (!res.ok) throw new StorageError(`The bucket answered ${res.status}.`, res.status);
    return "write";
  }
}

export const s3Provider: StorageProvider = {
  id: "s3",
  label: "An S3-compatible bucket (S3, R2, MinIO)",
  remote: true,
  fields: [
    { key: "endpoint", label: "Endpoint", type: "url", placeholder: "https://<account>.r2.cloudflarestorage.com" },
    { key: "bucket", label: "Bucket" },
    { key: "region", label: "Region", optional: true, placeholder: "auto" },
    { key: "folder", label: "Folder", optional: true, help: "Keep the library under this folder of the bucket." },
    { key: "accessKey", label: "Access key" },
    { key: "secretKey", label: "Secret", type: "password" },
  ],
  create: (c) => new S3Storage(c as unknown as S3Config),
};
