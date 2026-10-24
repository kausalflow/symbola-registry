// Reads the data `symbolon site build` wrote into public/, at build time.
import fs from "node:fs";
import path from "node:path";
import { parse as parseToml } from "smol-toml";

const ROOT = path.resolve("public");

export interface Pack {
  id: string;
  version: number;
  title: string;
  license: string;
  authors: string[];
  digest: string;
  tarball_sha256: string;
  signed: boolean;
  summary_line: string;
  summary: {
    obligations: number;
    by_status: { decided: number; default: number; open: number };
    assumptions: number;
    monitored_assumptions: number;
    components: number;
    checks: number;
  };
  files: string[];
  price: { amount: number; currency: string } | null;
}

function index(): { packs: Pack[]; store?: string } {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "index.json"), "utf8"));
}

export function packs(): Pack[] {
  return index().packs;
}

/** The store Worker that sells priced packs, if the registry has one. */
export function store(): string | undefined {
  return index().store;
}

export function formatPrice(price: Pack["price"]): string {
  return price ? `${(price.amount / 100).toFixed(2)} ${price.currency.toUpperCase()}` : "Free";
}

export function readFile(pack: Pack, rel: string): string {
  return fs.readFileSync(path.join(ROOT, "packs", pack.id, "files", rel), "utf8");
}

export interface Obligation { id: string; statement: string; status: string; kind?: string; checks?: string[] }
export interface Assumption { id: string; statement: string; monitor: string }

export function obligations(pack: Pack): Obligation[] {
  return (parseToml(readFile(pack, "obligations.toml")) as any).obligation ?? [];
}

export function assumptions(pack: Pack): Assumption[] {
  return pack.files
    .filter((f) => f.startsWith("assumptions/") && f.endsWith(".toml"))
    .map((f) => parseToml(readFile(pack, f)) as any);
}

/** A link under the site's base path. */
export function url(p: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}/${p.replace(/^\//, "")}`;
}
