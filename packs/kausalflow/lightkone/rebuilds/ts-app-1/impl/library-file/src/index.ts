// lightkone/library-file@1: reading lightkone/library.json and writing it back,
// with lightkone/library.bib, byte for byte. Pure module: no Node or DOM APIs.
import { exportBibtex } from "../../bibtex-export/src/index.ts";
import { clean, surname } from "../../pdf-filing/src/index.ts";

/** Raised for a file this lightkone must not read; the harness reports it as ValueError. */
export class ValueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValueError";
  }
}

/** A paper as lightkone stores it. Unknown keys are kept as they are. */
export interface StoredPaper {
  id: string;
  key: string;
  type: string;
  title: string;
  authors: string[];
  year?: number | null;
  venue?: string | null;
  abstract?: string | null;
  doi?: string | null;
  arxiv?: string | null;
  url?: string | null;
  tags: string[];
  file?: string | null;
  added: string;
  fields: Record<string, string>;
  folders?: string[];
  /** Storage key of its PDF. */
  pdf?: string;
  notes?: string;
  starred?: boolean;
  /** ISO time it went to the trash; any JS-truthy value counts as trashed. */
  trashed?: unknown;
  /** ISO time it was last opened in the reader. */
  opened?: string;
  /** Storage keys of a saved web page. */
  html?: string;
  markdown?: string;
  [extra: string]: unknown;
}

export interface BibSyncTarget {
  [key: string]: unknown;
}

/** library.json's top-level object as parsed; other tools' top-level keys are kept. */
export interface LibraryData {
  format: "lightkone-library";
  version?: unknown;
  papers: StoredPaper[];
  bibSync?: BibSyncTarget[];
  [extra: string]: unknown;
}

const FORMAT = "lightkone-library";
const VERSION = 1;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** The folders Paperpile's Drive paths (file, ";"-separated) put a paper in. */
export function foldersFromFile(file: unknown, authors: readonly string[] = []): string[] {
  const names = new Set<string>();
  for (const a of authors) {
    if (typeof a !== "string") continue;
    const n = clean(surname(a)).toUpperCase();
    if (n) names.add(n);
  }
  const isAuthorFolder = (d: string) =>
    d === "Other" || (names.size ? names.has(d) : d === d.toUpperCase() && d !== d.toLowerCase());

  const out: string[] = [];
  if (typeof file !== "string") return out;
  for (const raw of file.split(";")) {
    const path = raw.trim();
    if (!path) continue;
    let dirs = path.split("/").slice(0, -1);
    if (dirs[0] === "All Papers") dirs = dirs.slice(1);
    if (dirs.length === 0 || (dirs.length === 1 && isAuthorFolder(dirs[0]))) continue;
    const f = dirs.join("/");
    if (!out.includes(f)) out.push(f);
  }
  return out;
}

/** Parses library.json, refuses foreign or newer files, and gives papers without folders theirs. */
export function loadLibrary(text: string): { data: LibraryData; foldered: number } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ValueError("library.json is not JSON");
  }
  if (!isObject(data) || data.format !== FORMAT) throw new ValueError("not a lightkone library");
  if (!Array.isArray(data.papers)) throw new ValueError("a lightkone library has a papers list");
  if (!data.papers.every(isObject)) throw new ValueError("every paper is an object");
  if (typeof data.version === "number" && data.version > VERSION) {
    throw new ValueError(`library.json is version ${data.version}, saved by a newer lightkone`);
  }
  let foldered = 0;
  for (const p of data.papers as StoredPaper[]) {
    if ("folders" in p) continue;
    p.folders = foldersFromFile(p.file, Array.isArray(p.authors) ? p.authors : []);
    if (p.folders.length) foldered++;
  }
  return { data: data as LibraryData, foldered };
}

/** library.json's exact text: format, version 1, papers, bibSync when non-empty, then other keys. */
export function serializeLibrary(data: LibraryData): string {
  const out: Record<string, unknown> = { format: FORMAT, version: VERSION, papers: data.papers };
  if (Array.isArray(data.bibSync) && data.bibSync.length) out.bibSync = data.bibSync;
  for (const k of Object.keys(data)) {
    if (k === "format" || k === "version" || k === "papers" || k === "bibSync") continue;
    out[k] = data[k];
  }
  return JSON.stringify(out, null, 1);
}

/** library.bib: each paper not in the trash, as bibtex-export writes it, joined by "\n". */
export function libraryBib(papers: readonly StoredPaper[]): string {
  return papers
    .filter((p) => !p.trashed)
    .map((p) => exportBibtex(p))
    .join("\n");
}

/** What a save writes; nothing when library.json's text would not change. */
export function saveLibrary(
  data: LibraryData,
  storedText: string | null,
): { written: boolean; library: string; bib: string | null } {
  const library = serializeLibrary(data);
  if (storedText !== null && library === storedText) return { written: false, library: storedText, bib: null };
  return { written: true, library, bib: libraryBib(data.papers) };
}

/** The contract: open library.json, then save it with nothing else changed. */
export function run(input: { text: string }): { written: boolean; library: string; bib: string | null; foldered: number } {
  const { data, foldered } = loadLibrary(input.text);
  return { ...saveLibrary(data, input.text), foldered };
}
