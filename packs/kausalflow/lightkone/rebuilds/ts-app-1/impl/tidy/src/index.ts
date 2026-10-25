// lightkone/tidy@1: find duplicate papers, pick the keeper, and work out what it gains.
// Pure module: no Node or DOM APIs.

/** A library paper. Tidy reads only the fields named here; any others are ignored. */
export interface Paper {
  id: string;
  title: string;
  authors?: string[];
  added: string;
  tags?: string[];
  folders?: string[] | null;
  year?: number | null;
  venue?: string | null;
  abstract?: string | null;
  doi?: string | null;
  arxiv?: string | null;
  url?: string | null;
  pdf?: string | null;
  file?: string | null;
  notes?: string | null;
  starred?: boolean | null;
  opened?: string | null;
  trashed?: string | null;
  fields?: Record<string, string>;
  [other: string]: unknown;
}

/**
 * What the kept paper gains. tags, folders, fields and added are the full new
 * values (the keeper's own included); the optional ones are present only when the
 * keeper should take them (notes: every distinct note joined; starred: true; the
 * rest: the keeper had none and another paper had one).
 */
export interface Patch {
  tags: string[];
  folders: string[];
  notes?: string;
  starred?: true;
  fields: Record<string, string>;
  added: string;
  abstract?: string;
  doi?: string;
  arxiv?: string;
  url?: string;
  venue?: string;
  year?: number;
  pdf?: string;
  file?: string;
  opened?: string;
}

export interface Group {
  /** The duplicates, in library order. */
  ids: string[];
  /** Id of the paper to keep. */
  keep: string;
  patch: Patch;
}

/** Fields the keeper takes from the first other paper with a value, when it has none. */
const FILL = ["abstract", "doi", "arxiv", "url", "venue", "year", "pdf", "file", "opened"] as const;

function invalid(message: string): Error {
  const e = new Error(message);
  e.name = "ValueError";
  return e;
}

/** Sets an own property even for keys such as "__proto__". */
function put(o: Record<string, unknown>, k: string, v: unknown): void {
  Object.defineProperty(o, k, { value: v, enumerable: true, writable: true, configurable: true });
}

const str = (v: unknown): string => (typeof v === "string" ? v : v === null || v === undefined ? "" : String(v));
const list = <T>(v: T[] | null | undefined): T[] => (Array.isArray(v) ? v : []);

/** A DOI as tidy compares it: trimmed, lower-cased, without an http(s)://(dx.)doi.org/ prefix. "" when blank. */
export function normDoi(s: string | null | undefined): string {
  return str(s).trim().toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, "");
}

/** An arXiv id as tidy compares it: trimmed, lower-cased, without an arxiv: prefix or a vN version. "" when blank. */
export function normArxiv(s: string | null | undefined): string {
  return str(s).trim().toLowerCase().replace(/^arxiv:/, "").replace(/v\d+$/, "");
}

/** The title as tidy compares it: NFKD, lower-cased, only a-z and 0-9. */
export function normTitle(s: string | null | undefined): string {
  return str(s).normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function firstAuthor(p: Paper): string {
  const authors = list(p.authors);
  const first = authors.length ? str(authors[0]).split(",")[0] : "";
  return first.normalize("NFKD").toLowerCase().replace(/[^a-z]/g, "");
}

/** The match keys of a paper: two papers sharing any key are duplicates. */
export function matchKeys(p: Paper): string[] {
  const out: string[] = [];
  const doi = normDoi(p.doi);
  if (doi) out.push("doi:" + doi);
  const arxiv = normArxiv(p.arxiv);
  if (arxiv) out.push("arxiv:" + arxiv);
  const t = normTitle(p.title);
  if (t.length > 20) out.push("title:" + t);
  else if (t.length > 3) out.push(`title:${t}:${firstAuthor(p)}`);
  return out;
}

function validate(papers: unknown): Paper[] {
  if (!Array.isArray(papers)) throw invalid("papers must be a list");
  const seen = new Set<string>();
  for (const p of papers) {
    if (!p || typeof p !== "object" || Array.isArray(p)) throw invalid("a paper is not an object");
    const id = (p as Paper).id;
    if (typeof id !== "string" || !id) throw invalid("every paper needs a non-empty string id");
    if (seen.has(id)) throw invalid("paper ids must be unique");
    seen.add(id);
  }
  return papers as Paper[];
}

function keeperOf(group: Paper[]): Paper {
  let best = group[0];
  const rank = (p: Paper) => [p.pdf ? 0 : 1, p.notes ? 0 : 1] as const;
  for (const p of group.slice(1)) {
    const [ap, an] = rank(p), [bp, bn] = rank(best);
    if (ap !== bp ? ap < bp : an !== bn ? an < bn : str(p.added) < str(best.added)) best = p;
  }
  return best;
}

function unique<T>(items: Iterable<T>): T[] {
  return [...new Set(items)];
}

function patchFor(keep: Paper, others: Paper[]): Patch {
  const everyone = [keep, ...others];
  const notes = unique(everyone.map((p) => (typeof p.notes === "string" ? p.notes.trim() : "")).filter(Boolean));
  const fields: Record<string, string> = {};
  for (const p of [...everyone].reverse()) {
    const f = p.fields;
    if (f && typeof f === "object" && !Array.isArray(f)) for (const [k, v] of Object.entries(f)) put(fields, k, v);
  }
  let added = str(keep.added);
  for (const p of others) if (str(p.added) < added) added = str(p.added);

  const patch: Record<string, unknown> = {
    tags: unique(everyone.flatMap((p) => list(p.tags))),
    folders: unique(everyone.flatMap((p) => list(p.folders))),
  };
  if (notes.length) patch.notes = notes.join("\n\n");
  if (everyone.some((p) => p.starred)) patch.starred = true;
  patch.fields = fields;
  patch.added = added;
  for (const k of FILL) {
    if (keep[k]) continue;
    const from = others.find((p) => p[k]);
    if (from) patch[k] = from[k];
  }
  return patch as unknown as Patch;
}

/** Groups of duplicates outside the trash, in the order of their first paper. */
export function findDuplicates(input: Paper[]): Group[] {
  const papers = validate(input);
  const live = papers.filter((p) => !p.trashed);

  // Union-find over library positions.
  const parent = live.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) i = parent[i] = parent[parent[i]];
    return i;
  };
  const owner = new Map<string, number>();
  live.forEach((p, i) => {
    for (const k of matchKeys(p)) {
      const j = owner.get(k);
      if (j === undefined) owner.set(k, i);
      else {
        const a = find(i), b = find(j);
        if (a !== b) parent[Math.max(a, b)] = Math.min(a, b);
      }
    }
  });

  const members = new Map<number, Paper[]>();
  live.forEach((p, i) => {
    const r = find(i);
    const m = members.get(r);
    if (m) m.push(p);
    else members.set(r, [p]);
  });

  const groups: Group[] = [];
  // Map iteration follows insertion, i.e. the position of each group's first paper.
  for (const group of members.values()) {
    if (group.length < 2) continue;
    const keep = keeperOf(group);
    groups.push({ ids: group.map((p) => p.id), keep: keep.id, patch: patchFor(keep, group.filter((p) => p !== keep)) });
  }
  return groups;
}

export function run(input: { papers: Paper[] }): { groups: Group[] } {
  if (!input || typeof input !== "object") throw invalid("input must be an object");
  return { groups: findDuplicates(input.papers) };
}
