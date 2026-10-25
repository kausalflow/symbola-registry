// lightkone/library-merge@1: three-way merge of two edited copies of library.json.
// Pure module: no Node or DOM APIs.

export type Paper = { id: string; [field: string]: unknown };

export interface Library {
  format?: "lightkone-library";
  version?: 1;
  papers: Paper[];
  bibSync?: Record<string, unknown>[] | null;
  /** Other top-level keys written by other tools are carried through (see mergeExtras). */
  [key: string]: unknown;
}

export interface MergeResult {
  file: Library;
  fromThem: number;
}

const SET_FIELDS = new Set(["tags", "folders"]);
const KNOWN_TOP = new Set(["format", "version", "papers", "bibSync"]);

function invalid(message: string): Error {
  const e = new Error(message);
  e.name = "ValueError";
  return e;
}

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/** Sets an own property even for keys such as "__proto__", so no field is lost. */
function put(o: Record<string, unknown>, k: string, v: unknown): void {
  Object.defineProperty(o, k, { value: v, enumerable: true, writable: true, configurable: true });
}

/** Equality by value: objects compare regardless of key order. */
export function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const bb = b as unknown[];
    return a.length === bb.length && a.every((x, i) => same(x, bb[i]));
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const ak = Object.keys(ao);
  if (ak.length !== Object.keys(bo).length) return false;
  return ak.every((k) => has(bo, k) && same(ao[k], bo[k]));
}

function check(lib: unknown, side: string): Library {
  if (!lib || typeof lib !== "object" || Array.isArray(lib)) throw invalid(`${side}: not a library`);
  const l = lib as Library;
  if (l.format !== undefined && l.format !== "lightkone-library") throw invalid(`${side}: unknown format`);
  if (l.version !== undefined && l.version !== 1) throw invalid(`${side}: unknown version`);
  if (!Array.isArray(l.papers)) throw invalid(`${side}: papers must be a list`);
  const seen = new Set<string>();
  for (const p of l.papers) {
    if (!p || typeof p !== "object" || Array.isArray(p)) throw invalid(`${side}: a paper is not an object`);
    if (typeof p.id !== "string" || !p.id || seen.has(p.id))
      throw invalid("every paper needs a unique, non-empty string id");
    seen.add(p.id);
    for (const v of Object.values(p)) if (v === null) throw invalid("leave a field out rather than setting it to null");
  }
  if (l.bibSync !== undefined && l.bibSync !== null && !Array.isArray(l.bibSync))
    throw invalid(`${side}: bibSync must be a list`);
  return l;
}

function byId(lib: Library | null): Map<string, Paper> {
  const m = new Map<string, Paper>();
  if (lib) for (const p of lib.papers) m.set(p.id, p);
  return m;
}

/** tags/folders: every item in o, then t's new ones, minus base items either side removed. */
function mergeSet(b: unknown, o: unknown, t: unknown): unknown[] {
  const list = (x: unknown) => (Array.isArray(x) ? x : []);
  const bl = list(b), ol = list(o), tl = list(t);
  const inList = (l: unknown[], x: unknown) => l.some((y) => same(x, y));
  const removed = bl.filter((x) => !inList(ol, x) || !inList(tl, x));
  const out: unknown[] = [];
  for (const x of [...ol, ...tl]) {
    if (inList(out, x) || inList(removed, x)) continue;
    out.push(x);
  }
  return out;
}

function mergeFields(b: Paper, o: Paper, t: Paper): Paper {
  // Key order: ours' keys, then keys only theirs has.
  const keys = [...Object.keys(o)];
  for (const k of Object.keys(t)) if (!has(o, k)) keys.push(k);
  for (const k of Object.keys(b)) if (!keys.includes(k)) keys.push(k);
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (SET_FIELDS.has(k) && (has(o, k) || has(t, k)) && (o[k] === undefined || Array.isArray(o[k])) && (t[k] === undefined || Array.isArray(t[k]))) {
      put(out, k, mergeSet(b[k], o[k], t[k]));
      continue;
    }
    const chosen = same(o[k], b[k]) ? t : o;
    if (has(chosen, k) && chosen[k] !== undefined) put(out, k, chosen[k]);
  }
  return out as Paper;
}

function mergePaper(b: Paper | undefined, o: Paper | undefined, t: Paper | undefined): Paper | undefined {
  if (!b) return o ?? t;
  if (!o) return t && !same(t, b) ? t : undefined;
  if (!t) return same(o, b) ? undefined : o;
  if (same(o, b)) return t;
  if (same(t, b)) return o;
  return mergeFields(b, o, t);
}

/**
 * Extra top-level keys (not format/version/papers/bibSync), which other tools may
 * write and library-file keeps: the same three-way rule as a paper field, i.e.
 * theirs' value unless ours changed it versus base (absence counts as a value);
 * a key absent from the chosen side is left out. The contract's inputs never have
 * any, so this does not affect the checked behaviour.
 */
function mergeExtras(base: Library | null, ours: Library, theirs: Library, out: Library): void {
  const keys: string[] = [];
  for (const lib of [ours, theirs]) for (const k of Object.keys(lib)) if (!KNOWN_TOP.has(k) && !keys.includes(k)) keys.push(k);
  for (const k of keys) {
    const b = base && has(base, k) ? base[k] : undefined;
    const chosen = same(ours[k], b) ? theirs : ours;
    if (has(chosen, k) && chosen[k] !== undefined) put(out, k, chosen[k]);
  }
}

export function mergeLibraries(base: Library | null, ours: Library, theirs: Library): MergeResult {
  if (base !== null && base !== undefined) check(base, "base");
  else base = null;
  check(ours, "ours");
  check(theirs, "theirs");

  const B = byId(base), O = byId(ours), T = byId(theirs);
  const order = theirs.papers.map((p) => p.id);
  for (const p of ours.papers) if (!T.has(p.id)) order.push(p.id);

  const papers: Paper[] = [];
  let fromThem = 0;
  for (const id of order) {
    const r = mergePaper(B.get(id), O.get(id), T.get(id));
    if (!same(r ?? null, O.get(id) ?? null)) fromThem++;
    if (r) papers.push(r);
  }

  const list = (l: Library | null) => (l && Array.isArray(l.bibSync) ? l.bibSync : []);
  const bibSync = same(list(ours), list(base)) ? list(theirs) : list(ours);

  const file: Library = { format: "lightkone-library", version: 1, papers };
  if (bibSync.length) file.bibSync = bibSync;
  mergeExtras(base, ours, theirs, file);
  return { file, fromThem };
}

export function run(input: { base?: Library | null; ours: Library; theirs: Library }): MergeResult {
  if (!input || typeof input !== "object") throw invalid("input must be an object");
  return mergeLibraries(input.base ?? null, input.ours, input.theirs);
}
