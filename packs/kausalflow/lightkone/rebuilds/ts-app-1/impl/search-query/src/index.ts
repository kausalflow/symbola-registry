// lightkone/search-query@1: filters and orders a paper library by a query
// string, as lightkone's search box does. Pure module: no Node or DOM APIs.

/** The fields of a paper that search reads. Extra fields are accepted and ignored. */
export interface Paper {
  id: string;
  title: string;
  added: string;
  key?: string;
  authors?: string[] | null;
  year?: number | null;
  venue?: string | null;
  abstract?: string | null;
  doi?: string | null;
  arxiv?: string | null;
  tags?: string[] | null;
  file?: string | null;
  pdf?: string | null;
  notes?: string | null;
  folders?: string[] | null;
  starred?: boolean | null;
  trashed?: string | null;
  opened?: string | null;
  [extra: string]: unknown;
}

export type Sort = "added" | "year" | "title" | "relevance" | "opened";

export const SORTS: readonly Sort[] = ["added", "year", "title", "relevance", "opened"];

/** NFKD, drop combining marks U+0300..U+036F, lower-case. */
export function fold(text: string): string {
  return text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// ── Query parsing ───────────────────────────────────────────────────────────

const FIELDS = new Set(["tag", "author", "year", "in", "has", "no", "is"]);

interface YearRange {
  lo: number;
  hi: number;
}

export interface ParsedQuery {
  /** Folded words; every one must match somewhere. */
  words: string[];
  tags: string[];
  authors: string[];
  folders: string[];
  has: string[];
  no: string[];
  is: string[];
  trash: boolean;
  recent: boolean;
  /** The last year: term that counts, if any. */
  year: YearRange | null;
}

// field:"quoted value" | field:value | "quoted word" | bare word.
// \s and \S are JavaScript's whitespace set (includes NBSP, U+3000, BOM).
const TOKEN = /(\w+):"([^"]*)"|(\w+):(\S+)|"([^"]*)"|(\S+)/g;

// search.year-number-spelling (open): ASCII digits with an optional fraction.
const YEAR_NUMBER = /^[0-9]+(?:\.[0-9]+)?$/;

function yearNumber(s: string | undefined): number {
  if (s === undefined || !YEAR_NUMBER.test(s)) return NaN;
  return Number(s);
}

function parseYear(value: string): YearRange | null {
  const parts = value.split("-");
  const lo = yearNumber(parts[0]);
  if (!(lo > 0)) return null; // not a number, or 0: the term does not count
  const b = yearNumber(parts[1]);
  const hi = b > 0 ? b : lo; // missing, empty, 0 or not a number: just A
  return { lo, hi };
}

export function parseQuery(query: string): ParsedQuery {
  const q: ParsedQuery = {
    words: [], tags: [], authors: [], folders: [], has: [], no: [], is: [],
    trash: false, recent: false, year: null,
  };
  for (const m of query.matchAll(TOKEN)) {
    const fieldRaw = m[1] ?? m[3];
    if (fieldRaw !== undefined) {
      const field = fieldRaw.toLowerCase();
      if (!FIELDS.has(field)) {
        q.words.push(fold(m[0])); // unknown field: the whole term is a word
        continue;
      }
      const value = m[2] ?? m[4];
      const v = fold(value);
      switch (field) {
        case "tag": q.tags.push(v); break;
        case "author": q.authors.push(v); break;
        case "in": q.folders.push(v.replace(/\/+$/, "")); break;
        case "has": q.has.push(v); break;
        case "no": q.no.push(v); break;
        case "is":
          if (v === "trash") q.trash = true;
          else if (v === "recent") q.recent = true;
          q.is.push(v);
          break;
        case "year": {
          const y = parseYear(v);
          if (y) q.year = y; // only the last counting year: term applies
          break;
        }
      }
      continue;
    }
    q.words.push(fold(m[5] ?? m[6]));
  }
  return q;
}

// ── Matching ────────────────────────────────────────────────────────────────

const present = (x: unknown): boolean => !!x;

function list(x: string[] | null | undefined): string[] {
  return Array.isArray(x) ? x : [];
}

interface Texts {
  title: string;
  authors: string;
  rest: string;
}

function texts(p: Paper): Texts {
  const rest = [p.abstract, p.venue, list(p.tags).join(" "), p.key, p.doi, p.arxiv, p.notes]
    .filter((x) => typeof x === "string" && x !== "")
    .join(" ");
  return {
    title: fold(p.title ?? ""),
    authors: fold(list(p.authors).join(" ; ")),
    rest: fold(rest),
  };
}

const HAS: Record<string, (p: Paper) => boolean> = {
  pdf: (p) => present(p.pdf) || present(p.file),
  abstract: (p) => present(p.abstract),
  arxiv: (p) => present(p.arxiv),
  notes: (p) => present(p.notes),
};

const NO: Record<string, (p: Paper) => boolean> = {
  pdf: (p) => !present(p.pdf),
  abstract: (p) => !present(p.abstract),
  arxiv: (p) => !present(p.arxiv),
  notes: (p) => !present(p.notes),
};

const IS: Record<string, (p: Paper) => boolean> = {
  starred: (p) => p.starred === true,
  recent: (p) => present(p.opened),
  trash: (p) => present(p.trashed),
};

/** Filters and the trash rule, everything but words. */
function passesFilters(p: Paper, q: ParsedQuery, authorText: string): boolean {
  if (present(p.trashed) !== q.trash) return false;
  if (q.tags.length) {
    const tags = list(p.tags).map(fold);
    if (!q.tags.every((t) => tags.includes(t))) return false;
  }
  if (!q.authors.every((a) => authorText.includes(a))) return false;
  if (q.year) {
    const y = p.year;
    if (!y || y < q.year.lo || y > q.year.hi) return false;
  }
  if (q.folders.length) {
    const folders = list(p.folders).map((f) => fold(f).replace(/\/+$/, ""));
    for (const target of q.folders) {
      if (!folders.some((f) => f === target || f.startsWith(target + "/"))) return false;
    }
  }
  for (const v of q.has) if (HAS[v] && !HAS[v](p)) return false;
  for (const v of q.no) if (NO[v] && !NO[v](p)) return false;
  for (const v of q.is) if (IS[v] && !IS[v](p)) return false;
  return true;
}

function wordScore(t: Texts, w: string): number {
  return (t.title.includes(w) ? 5 : 0) + (t.authors.includes(w) ? 4 : 0) + (t.rest.includes(w) ? 1 : 0);
}

// ── Ordering ────────────────────────────────────────────────────────────────

let collator: Intl.Collator | null = null;
function titleCompare(a: string, b: string): number {
  // CLDR root collation, tertiary strength, as localeCompare does.
  collator ??= new Intl.Collator("und", { usage: "sort", sensitivity: "variant" });
  return collator.compare(a, b);
}

const desc = (a: string, b: string): number => (a < b ? 1 : a > b ? -1 : 0);

interface Hit {
  paper: Paper;
  score: number;
  /** 0 for a record match, 1 for a full-text-only match. */
  tier: number;
}

type Order = "added" | "year" | "title" | "relevance" | "opened";

function effectiveOrder(sort: Sort, q: ParsedQuery): Order {
  if (sort !== "added") return sort; // explicit sorts override the default
  if (q.recent) return "opened";
  if (q.words.length) return "relevance";
  return "added";
}

// Array.prototype.sort is stable, so ties keep the order going in.
function order(hits: Hit[], how: Order): Hit[] {
  const byAdded = (a: Hit, b: Hit) => desc(a.paper.added, b.paper.added);
  switch (how) {
    case "added":
      return hits.sort(byAdded);
    case "year":
      return hits.sort((a, b) => (b.paper.year || 0) - (a.paper.year || 0));
    case "title":
      return hits.sort((a, b) => titleCompare(a.paper.title ?? "", b.paper.title ?? ""));
    case "opened":
      return hits.sort(byAdded).sort((a, b) => desc(a.paper.opened || "", b.paper.opened || ""));
    case "relevance":
      return hits.sort(byAdded).sort((a, b) => a.tier - b.tier || b.score - a.score);
  }
}

function normalizeSort(sort: Sort | undefined | null): Sort {
  return sort && (SORTS as readonly string[]).includes(sort) ? sort : "added";
}

/**
 * The full-text flow (PRODUCT.md flow 6). A paper that passes every filter and
 * the trash rule, but that some word matched nowhere in its record, is still
 * shown when `hasAllWordsInText(id, foldedWords)` says its text holds every
 * word. Under relevance such papers rank below every record match (newest
 * added first among themselves); under every other order they are merged into
 * that order like any other result. With a callback that always returns false
 * the result equals `search`.
 */
export function searchWithFullText(
  papers: readonly Paper[],
  query: string,
  sort: Sort | undefined,
  hasAllWordsInText: (id: string, foldedWords: string[]) => boolean,
): string[] {
  const q = parseQuery(query);
  const hits: Hit[] = [];
  for (const paper of papers) {
    const t = texts(paper);
    if (!passesFilters(paper, q, t.authors)) continue;
    let score = 0;
    let missed = false;
    for (const w of q.words) {
      const s = wordScore(t, w);
      if (!s) { missed = true; break; }
      score += s;
    }
    if (!missed) hits.push({ paper, score, tier: 0 });
    else if (hasAllWordsInText(paper.id, q.words.slice())) hits.push({ paper, score: 0, tier: 1 });
  }
  return order(hits, effectiveOrder(normalizeSort(sort), q)).map((h) => h.paper.id);
}

/** The ids of the matching papers, in display order. */
export function search(papers: readonly Paper[], query: string, sort?: Sort): string[] {
  return searchWithFullText(papers, query, sort, () => false);
}

// ── Contract entry point ────────────────────────────────────────────────────

function reject(message: string): never {
  const e = new Error(message);
  e.name = "ValueError";
  throw e;
}

/** The contract's run(input) -> {ids}. Rejects input the schema rules out. */
export function run(input: { papers: Paper[]; query: string; sort?: Sort }): { ids: string[] } {
  if (!input || typeof input !== "object") reject("input must be an object");
  const { papers, query } = input;
  const sort = input.sort ?? "added";
  if (!Array.isArray(papers)) reject("papers must be a list");
  if (typeof query !== "string") reject("query must be a string");
  if (!(SORTS as readonly string[]).includes(sort)) reject(`unknown sort: ${String(sort)}`);
  const seen = new Set<string>();
  for (const p of papers) {
    if (!p || typeof p !== "object") reject("each paper must be an object");
    if (typeof p.id !== "string" || !p.id) reject("paper id must be a non-empty string");
    if (typeof p.title !== "string") reject("paper title must be a string");
    if (typeof p.added !== "string") reject("paper added must be a string");
    if (seen.has(p.id)) reject("paper ids must be unique");
    seen.add(p.id);
  }
  return { ids: search(papers, query, sort) };
}
