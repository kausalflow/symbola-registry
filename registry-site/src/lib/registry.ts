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
  preview?: "full" | "brief";
  publisher?: { name: string; url: string; support: { label: string; url: string }[] };
  evidence?: EvidenceSummary;
  older?: { version: number; digest: string; tarball_sha256: string; path: string }[];
}

export interface EvidenceSummary {
  attestations: number;
  invalid: number;
  on_latest: number;
  components: number;
  components_with_passing_build: number;
  builds: string[];
  full_builds: string[];
  runners: string[];
  newest: string | null;
}

export interface Attestation {
  file: string;
  valid: boolean;
  problems: string[];
  contract?: string;
  component?: string | null;
  covers?: "latest" | "older" | "unpublished";
  pack_version?: number | null;
  pack_digest?: string;
  build?: string;
  result?: string;
  passed?: number;
  failed?: string[];
  runner?: string;
  finished?: string | null;
}

export function evidence(pack: Pack): Attestation[] {
  const file = path.join(ROOT, "packs", pack.id, "evidence.json");
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")).attestations : [];
}

/** Catalog order: packs with more independently passing evidence first (design v0.5, 2.2). */
export function rank(a: Pack, b: Pack): number {
  const key = (p: Pack) => [
    p.evidence?.components_with_passing_build ?? 0,
    p.evidence?.builds.length ?? 0,
    p.evidence?.runners.length ?? 0,
  ];
  const [x, y] = [key(a), key(b)];
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return y[i] - x[i];
  return a.id.localeCompare(b.id);
}

export function evidenceLine(e: EvidenceSummary | undefined): string {
  if (!e || e.attestations === 0) return "No evidence yet";
  const parts = [`${e.components_with_passing_build} of ${e.components} components pass a build`,
    `${e.builds.length} build${e.builds.length === 1 ? "" : "s"}`,
    `${e.runners.length} runner${e.runners.length === 1 ? "" : "s"}`];
  if (e.invalid) parts.push(`${e.invalid} invalid`);
  return parts.join(" · ");
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
