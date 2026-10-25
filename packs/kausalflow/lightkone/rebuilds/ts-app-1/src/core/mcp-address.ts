// Flow 13: the MCP address carries the storage settings encrypted for the
// site. The browser encrypts them itself with the site's public key (ECDH
// P-256 + HKDF + AES-GCM), so the settings never reach the site in the clear;
// only the site's private key can open the address.

const b64url = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const unb64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

const INFO = new TextEncoder().encode("lightkone-mcp-v1");

async function aesKey(shared: ArrayBuffer, usage: KeyUsage[]) {
  const ikm = await crypto.subtle.importKey("raw", shared, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: new Uint8Array(32), info: INFO }, ikm, { name: "AES-GCM", length: 256 }, false, usage);
}

export interface McpSecret {
  storage: string;
  config: Record<string, string>;
  email?: string;
}

export async function sealForSite(secret: McpSecret, sitePublicJwk: JsonWebKey): Promise<string> {
  const site = await crypto.subtle.importKey("jwk", sitePublicJwk, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const eph = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  const shared = await crypto.subtle.deriveBits({ name: "ECDH", public: site }, eph.privateKey, 256);
  const key = await aesKey(shared, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(secret))));
  const pub = new Uint8Array(await crypto.subtle.exportKey("raw", eph.publicKey));
  const out = new Uint8Array(pub.length + iv.length + data.length);
  out.set(pub, 0);
  out.set(iv, pub.length);
  out.set(data, pub.length + iv.length);
  return b64url(out);
}

export async function openOnSite(token: string, sitePrivateJwk: JsonWebKey): Promise<McpSecret> {
  const raw = unb64url(token);
  const pub = await crypto.subtle.importKey("raw", raw.subarray(0, 65), { name: "ECDH", namedCurve: "P-256" }, false, []);
  const priv = await crypto.subtle.importKey("jwk", sitePrivateJwk, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
  const shared = await crypto.subtle.deriveBits({ name: "ECDH", public: pub }, priv, 256);
  const key = await aesKey(shared, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: raw.subarray(65, 77) }, key, raw.subarray(77));
  return JSON.parse(new TextDecoder().decode(plain));
}
