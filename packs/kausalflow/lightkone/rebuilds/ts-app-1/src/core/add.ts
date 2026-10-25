// Adding papers (flows 3, 4 and 5): identifiers, BibTeX, .bib files and PDFs
// become papers, with citation-key's keys, pdf-filing's paths and the add
// duplicate rule (which is not tidy's rule).
import { importBibtex } from "../../impl/bibtex-import/src/index.ts";
import { assignKeys } from "../../impl/citation-key/src/index.ts";
import { foldersFromFile } from "../../impl/library-file/src/index.ts";
import { filePdf } from "../../impl/pdf-filing/src/index.ts";
import { normArxiv, normDoi } from "../../impl/tidy/src/index.ts";
import { newId, type LibraryStore } from "./library.ts";
import { builtinLookups, doiDraft, arxivDraft, findIdentifiers, unpaywallPdf, type Lookup, type LookupContext } from "./lookups.ts";
import type { Draft, Paper } from "./types.ts";
import { pagePath } from "./types.ts";

/** Turns pasted text or a file's text into drafts (BibTeX is built in). */
export interface Importer {
  id: string;
  label: string;
  match(text: string): boolean;
  parse(text: string): Draft[] | Promise<Draft[]>;
}

export const bibtexImporter: Importer = {
  id: "bibtex",
  label: "BibTeX",
  match: (t) => /@[a-z]+\s*[{(]/i.test(t),
  parse: (t) => importBibtex(t).map(fromImported),
};

/** A bibtex-import draft, with its nulls as absent fields. */
function fromImported(d: ReturnType<typeof importBibtex>[number]): Draft {
  const out: Draft = { title: d.title, type: d.type, authors: d.authors, tags: d.tags, fields: d.fields, key: d.key };
  for (const k of ["year", "venue", "abstract", "doi", "arxiv", "url", "file", "notes"] as const) {
    if (d[k] !== null && d[k] !== undefined) (out as unknown as Record<string, unknown>)[k] = d[k];
  }
  return out;
}

export interface AddEnv {
  store: LibraryStore;
  ctx: LookupContext;
  lookups?: Lookup[];
  importers?: Importer[];
  /** Fetch free PDFs for new papers (on by default). */
  fetchPdfs?: boolean;
  /** Text of a PDF's first page, for identifying dropped PDFs (browser: pdf.js). */
  firstPageText?: (pdf: Uint8Array) => Promise<{ text: string; title?: string; author?: string }>;
  onProgress?: (message: string) => void;
}

export interface AddReport {
  added: Paper[];
  /** Existing papers a draft duplicated; they gained what they lacked. */
  existing: Paper[];
  failed: { line: string; error: string }[];
}

// ── The duplicate rule (flow 3) ──────────────────────────────────────────

const titleKey = (t: string | null | undefined) => (t ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** The paper (trashed ones included) a draft duplicates, if any. */
export function findDuplicate(papers: readonly Paper[], d: Draft): Paper | undefined {
  const doi = normDoi(d.doi);
  const arxiv = normArxiv(d.arxiv);
  const key = (d.key ?? "").trim();
  const title = titleKey(d.title);
  return papers.find(
    (p) =>
      (doi && normDoi(p.doi) === doi) ||
      (arxiv && normArxiv(p.arxiv) === arxiv) ||
      (key && p.key === key) ||
      (title.length > 20 && titleKey(p.title) === title),
  );
}

const FILLED = ["abstract", "doi", "arxiv", "url", "venue", "year", "file"] as const;

const empty = (v: unknown) => v === undefined || v === null || v === "";

/** The existing paper gains the draft's missing fields, tags and folders; nothing else changes. */
export function fillFrom(p: Paper, d: Draft): boolean {
  let changed = false;
  for (const k of FILLED) {
    const v = d[k];
    if (empty(p[k]) && !empty(v)) {
      (p as unknown as Record<string, unknown>)[k] = v;
      changed = true;
    }
  }
  for (const t of d.tags ?? []) {
    if (!p.tags.includes(t)) {
      p.tags.push(t);
      changed = true;
    }
  }
  const folders = d.folders ?? (d.file ? foldersFromFile(d.file, d.authors ?? []) : []);
  for (const f of folders) {
    p.folders ??= [];
    if (!p.folders.includes(f)) {
      p.folders.push(f);
      changed = true;
    }
  }
  return changed;
}

/** A new paper from a draft. Absent fields are left out, never null. */
export function paperFromDraft(d: Draft, key: string, now = new Date()): Paper {
  const p: Paper = {
    id: newId(),
    key,
    type: (d.type ?? "").toLowerCase() || "article",
    title: d.title.trim(),
    authors: d.authors ?? [],
    tags: [...new Set(d.tags ?? [])],
    added: now.toISOString(),
    fields: d.fields ?? {},
  };
  for (const k of ["year", "venue", "abstract", "doi", "arxiv", "url", "file", "notes"] as const) {
    if (!empty(d[k])) (p as Record<string, unknown>)[k] = d[k];
  }
  // Papers from Paperpile land in the folders their file paths name.
  p.folders = d.folders ?? (d.file ? foldersFromFile(d.file, p.authors) : []);
  return p;
}

/**
 * Adds drafts in order: a duplicate fills the existing paper, anything else
 * becomes a new paper with a citation-key key (a key never changes once given).
 */
export function addDrafts(store: LibraryStore, drafts: Draft[], extraTags: string[] = [], folder?: string): AddReport {
  const report: AddReport = { added: [], existing: [], failed: [] };
  for (const raw of drafts) {
    const d: Draft = { ...raw, tags: [...(raw.tags ?? []), ...extraTags] };
    if (folder) d.folders = [...(d.folders ?? (d.file ? foldersFromFile(d.file, d.authors ?? []) : [])), folder];
    if (!d.title?.trim()) {
      report.failed.push({ line: d.key ?? "(untitled)", error: "No title" });
      continue;
    }
    const dup = findDuplicate(store.papers, d);
    if (dup) {
      fillFrom(dup, d);
      if (!report.existing.includes(dup) && !report.added.includes(dup)) report.existing.push(dup);
      continue;
    }
    const taken = store.papers.map((p) => p.key);
    const [key] = assignKeys([{ title: d.title, authors: d.authors ?? [], year: d.year ?? null, key: d.key ?? null }], taken);
    const paper = paperFromDraft(d, key);
    store.papers.push(paper);
    report.added.push(paper);
  }
  return report;
}

// ── PDFs ─────────────────────────────────────────────────────────────────

export function isPdf(bytes: Uint8Array): boolean {
  // "%PDF" may follow a little junk; readers accept it in the first 1 KB.
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
  return head.includes("%PDF-");
}

/** Stores a PDF for a paper at the path pdf-filing gives and records it. */
export async function attachPdf(store: LibraryStore, paper: Paper, bytes: Uint8Array): Promise<string> {
  const others = store.papers.filter((p) => p.id !== paper.id).map((p) => ({ id: p.id, pdf: p.pdf, file: p.file }));
  const { pdf } = filePdf({ id: paper.id, title: paper.title, authors: paper.authors, year: paper.year ?? null }, others);
  await store.storage.write(pdf, bytes, "application/pdf");
  paper.pdf = pdf;
  return pdf;
}

async function download(env: AddEnv, url: string): Promise<Uint8Array | null> {
  try {
    const res = await env.ctx.net.passThrough(url);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    return isPdf(bytes) ? bytes : null;
  } catch {
    return null;
  }
}

/** Get free PDF: arXiv directly, others via the draft's link or Unpaywall. */
export async function fetchFreePdf(env: AddEnv, paper: Paper, hint?: string): Promise<boolean> {
  const urls: string[] = [];
  if (paper.arxiv) urls.push(`https://arxiv.org/pdf/${paper.arxiv}`);
  if (hint) urls.push(hint);
  if (paper.doi) {
    const oa = await unpaywallPdf(paper.doi, env.ctx).catch(() => null);
    if (oa) urls.push(oa);
  }
  for (const url of [...new Set(urls)]) {
    const bytes = await download(env, url);
    if (bytes) {
      await attachPdf(env.store, paper, bytes);
      return true;
    }
  }
  return false;
}

async function savePage(store: LibraryStore, paper: Paper, d: Draft) {
  if (d.pageHtml === undefined) return;
  const html = pagePath(paper.id, "html");
  const md = pagePath(paper.id, "md");
  await store.storage.write(html, d.pageHtml, "text/html");
  await store.storage.write(md, d.pageMarkdown ?? "", "text/markdown");
  paper.html = html;
  paper.markdown = md;
}

// ── Flow 3 and 4: pasted lines, BibTeX and .bib files ────────────────────

export async function addText(env: AddEnv, text: string, extraTags: string[] = [], folder?: string): Promise<AddReport> {
  const importers = env.importers ?? [bibtexImporter];
  const lookups = env.lookups ?? builtinLookups;
  const report: AddReport = { added: [], existing: [], failed: [] };
  const merge = (r: AddReport) => {
    report.added.push(...r.added);
    for (const p of r.existing) if (!report.existing.includes(p)) report.existing.push(p);
    report.failed.push(...r.failed);
  };
  const pending: { paper: Paper; draft: Draft }[] = [];

  const importer = importers.find((i) => i.match(text));
  if (importer) {
    env.onProgress?.(`Reading ${importer.label}…`);
    const drafts = await importer.parse(text);
    if (!drafts.length) report.failed.push({ line: text.slice(0, 60), error: `No ${importer.label} entries with a title` });
    const r = addDrafts(env.store, drafts, extraTags, folder);
    merge(r);
    for (const p of r.added) pending.push({ paper: p, draft: {} as Draft });
  } else {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const lookup = lookups.find((l) => l.match(line));
      if (!lookup) {
        report.failed.push({ line, error: "Not an arXiv id, DOI, link or BibTeX" });
        continue;
      }
      env.onProgress?.(`Looking up ${line}…`);
      try {
        const drafts = await lookup.resolve(line, env.ctx);
        if (!drafts.length) {
          report.failed.push({ line, error: `${lookup.label} found nothing` });
          continue;
        }
        const r = addDrafts(env.store, drafts, extraTags, folder);
        merge(r);
        r.added.forEach((p, i) => pending.push({ paper: p, draft: drafts[i] }));
      } catch (e) {
        report.failed.push({ line, error: (e as Error).message });
      }
    }
  }

  for (const { paper, draft } of pending) {
    if (draft.pageHtml !== undefined) {
      await savePage(env.store, paper, draft).catch((e) => report.failed.push({ line: paper.title, error: `Page not saved: ${e.message}` }));
      continue;
    }
    if (env.fetchPdfs !== false && !paper.pdf) {
      env.onProgress?.(`Looking for a free PDF of ${paper.title}…`);
      await fetchFreePdf(env, paper, draft.pdfUrl).catch(() => false);
    }
  }
  return report;
}

// ── Flow 5: PDFs ─────────────────────────────────────────────────────────

export async function addPdf(env: AddEnv, name: string, bytes: Uint8Array): Promise<AddReport> {
  const report: AddReport = { added: [], existing: [], failed: [] };
  if (!isPdf(bytes)) {
    report.failed.push({ line: name, error: "Not a PDF" });
    return report;
  }
  let draft: Draft | null = null;
  let info: { text: string; title?: string; author?: string } = { text: "" };
  if (env.firstPageText) info = await env.firstPageText(bytes).catch(() => ({ text: "" }));
  const ids = findIdentifiers(info.text);
  env.onProgress?.(`Identifying ${name}…`);
  try {
    if (ids.arxiv) draft = await arxivDraft(ids.arxiv, env.ctx);
    if (!draft && ids.doi) draft = await doiDraft(ids.doi, env.ctx);
  } catch {
    draft = null;
  }
  if (!draft) {
    // Unidentified: keep it under its own title, so it is not lost.
    const title = info.title?.trim() || name.replace(/\.pdf$/i, "");
    draft = { type: "misc", title, authors: info.author ? info.author.split(/;|\band\b/).map((a) => a.trim()).filter(Boolean) : [], tags: [] };
    if (ids.doi) draft.doi = ids.doi;
    if (ids.arxiv) draft.arxiv = ids.arxiv;
  }
  const dup = findDuplicate(env.store.papers, draft);
  if (dup) {
    fillFrom(dup, draft);
    if (!dup.pdf) await attachPdf(env.store, dup, bytes);
    report.existing.push(dup);
    return report;
  }
  const r = addDrafts(env.store, [draft]);
  for (const p of r.added) await attachPdf(env.store, p, bytes);
  report.added.push(...r.added);
  report.existing.push(...r.existing);
  return report;
}
