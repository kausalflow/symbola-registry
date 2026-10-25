// The owner's settings: kept in this browser's localStorage only, never in
// the library and never sent to the site (obligation app.credentials-stay-local).

export interface Settings {
  /** Storage provider id ("browser", "s3", "github", or a plugin's). */
  storage: string;
  storageConfig: Record<string, string>;
  /** Contact email for Unpaywall's open-access copies. */
  email: string;
  claudeKey: string;
  /** Token for writing synced .bib files to GitHub (flow 11). */
  bibSyncToken: string;
  plugins: string[];
  mcpAddress: string;
  /** Values of settings fields that plugins declare, by key. */
  pluginSettings: Record<string, string>;
  darkPages: boolean;
  /** "Remove them" pressed: the example papers are not added again. */
  examplesRemoved: boolean;
}

const KEY = "lightkone.settings";

export const defaults: Settings = {
  storage: "browser",
  storageConfig: {},
  email: "",
  claudeKey: "",
  bibSyncToken: "",
  plugins: [],
  mcpAddress: "",
  pluginSettings: {},
  darkPages: false,
  examplesRemoved: false,
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

export function saveSettings(s: Settings): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}

// ── Backup: export and import the settings, encrypted with a passphrase ──

const enc = new TextEncoder();
const dec = new TextDecoder();

async function passKey(pass: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 310_000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function exportBackup(s: Settings, passphrase: string): Promise<string> {
  const plain = JSON.stringify(s);
  if (!passphrase) return JSON.stringify({ format: "lightkone-settings", version: 1, settings: s }, null, 1);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await passKey(passphrase, salt);
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plain)));
  return JSON.stringify(
    { format: "lightkone-settings", version: 1, encrypted: { kdf: "PBKDF2-SHA256-310000", salt: b64(salt), iv: b64(iv), data: b64(data) } },
    null,
    1,
  );
}

export async function importBackup(text: string, passphrase: string): Promise<Settings> {
  const doc = JSON.parse(text);
  if (doc?.format !== "lightkone-settings") throw new Error("This is not a lightkone settings backup.");
  if (doc.settings) return { ...defaults, ...doc.settings };
  if (!passphrase) throw new Error("This backup is encrypted: enter its passphrase.");
  const e = doc.encrypted;
  const key = await passKey(passphrase, unb64(e.salt));
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(e.iv) as BufferSource }, key, unb64(e.data) as BufferSource);
  } catch {
    throw new Error("Wrong passphrase.");
  }
  return { ...defaults, ...JSON.parse(dec.decode(plain)) };
}
