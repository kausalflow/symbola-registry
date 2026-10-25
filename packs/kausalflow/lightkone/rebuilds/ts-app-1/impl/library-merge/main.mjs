// impl/_harness/lines.ts
import { createInterface } from "node:readline";
var ContractError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ValueError";
  }
};
function serve(run2) {
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  rl.on("line", (line) => {
    if (!line.trim()) return;
    let reply;
    try {
      reply = { output: run2(JSON.parse(line)) };
    } catch (e) {
      const err = e;
      const type = err instanceof ContractError ? "ValueError" : err?.name || "Error";
      reply = { error: { type, message: String(err?.message ?? err) } };
    }
    process.stdout.write(JSON.stringify(reply) + "\n");
  });
}

// impl/library-merge/src/index.ts
var SET_FIELDS = /* @__PURE__ */ new Set(["tags", "folders"]);
var KNOWN_TOP = /* @__PURE__ */ new Set(["format", "version", "papers", "bibSync"]);
function invalid(message) {
  const e = new Error(message);
  e.name = "ValueError";
  return e;
}
var has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
function put(o, k, v) {
  Object.defineProperty(o, k, { value: v, enumerable: true, writable: true, configurable: true });
}
function same(a, b) {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const bb = b;
    return a.length === bb.length && a.every((x, i) => same(x, bb[i]));
  }
  const ao = a;
  const bo = b;
  const ak = Object.keys(ao);
  if (ak.length !== Object.keys(bo).length) return false;
  return ak.every((k) => has(bo, k) && same(ao[k], bo[k]));
}
function check(lib, side) {
  if (!lib || typeof lib !== "object" || Array.isArray(lib)) throw invalid(`${side}: not a library`);
  const l = lib;
  if (l.format !== void 0 && l.format !== "lightkone-library") throw invalid(`${side}: unknown format`);
  if (l.version !== void 0 && l.version !== 1) throw invalid(`${side}: unknown version`);
  if (!Array.isArray(l.papers)) throw invalid(`${side}: papers must be a list`);
  const seen = /* @__PURE__ */ new Set();
  for (const p of l.papers) {
    if (!p || typeof p !== "object" || Array.isArray(p)) throw invalid(`${side}: a paper is not an object`);
    if (typeof p.id !== "string" || !p.id || seen.has(p.id))
      throw invalid("every paper needs a unique, non-empty string id");
    seen.add(p.id);
    for (const v of Object.values(p)) if (v === null) throw invalid("leave a field out rather than setting it to null");
  }
  if (l.bibSync !== void 0 && l.bibSync !== null && !Array.isArray(l.bibSync))
    throw invalid(`${side}: bibSync must be a list`);
  return l;
}
function byId(lib) {
  const m = /* @__PURE__ */ new Map();
  if (lib) for (const p of lib.papers) m.set(p.id, p);
  return m;
}
function mergeSet(b, o, t) {
  const list = (x) => Array.isArray(x) ? x : [];
  const bl = list(b), ol = list(o), tl = list(t);
  const inList = (l, x) => l.some((y) => same(x, y));
  const removed = bl.filter((x) => !inList(ol, x) || !inList(tl, x));
  const out = [];
  for (const x of [...ol, ...tl]) {
    if (inList(out, x) || inList(removed, x)) continue;
    out.push(x);
  }
  return out;
}
function mergeFields(b, o, t) {
  const keys = [...Object.keys(o)];
  for (const k of Object.keys(t)) if (!has(o, k)) keys.push(k);
  for (const k of Object.keys(b)) if (!keys.includes(k)) keys.push(k);
  const out = {};
  for (const k of keys) {
    if (SET_FIELDS.has(k) && (has(o, k) || has(t, k)) && (o[k] === void 0 || Array.isArray(o[k])) && (t[k] === void 0 || Array.isArray(t[k]))) {
      put(out, k, mergeSet(b[k], o[k], t[k]));
      continue;
    }
    const chosen = same(o[k], b[k]) ? t : o;
    if (has(chosen, k) && chosen[k] !== void 0) put(out, k, chosen[k]);
  }
  return out;
}
function mergePaper(b, o, t) {
  if (!b) return o ?? t;
  if (!o) return t && !same(t, b) ? t : void 0;
  if (!t) return same(o, b) ? void 0 : o;
  if (same(o, b)) return t;
  if (same(t, b)) return o;
  return mergeFields(b, o, t);
}
function mergeExtras(base, ours, theirs, out) {
  const keys = [];
  for (const lib of [ours, theirs]) for (const k of Object.keys(lib)) if (!KNOWN_TOP.has(k) && !keys.includes(k)) keys.push(k);
  for (const k of keys) {
    const b = base && has(base, k) ? base[k] : void 0;
    const chosen = same(ours[k], b) ? theirs : ours;
    if (has(chosen, k) && chosen[k] !== void 0) put(out, k, chosen[k]);
  }
}
function mergeLibraries(base, ours, theirs) {
  if (base !== null && base !== void 0) check(base, "base");
  else base = null;
  check(ours, "ours");
  check(theirs, "theirs");
  const B = byId(base), O = byId(ours), T = byId(theirs);
  const order = theirs.papers.map((p) => p.id);
  for (const p of ours.papers) if (!T.has(p.id)) order.push(p.id);
  const papers = [];
  let fromThem = 0;
  for (const id of order) {
    const r = mergePaper(B.get(id), O.get(id), T.get(id));
    if (!same(r ?? null, O.get(id) ?? null)) fromThem++;
    if (r) papers.push(r);
  }
  const list = (l) => l && Array.isArray(l.bibSync) ? l.bibSync : [];
  const bibSync = same(list(ours), list(base)) ? list(theirs) : list(ours);
  const file = { format: "lightkone-library", version: 1, papers };
  if (bibSync.length) file.bibSync = bibSync;
  mergeExtras(base, ours, theirs, file);
  return { file, fromThem };
}
function run(input) {
  if (!input || typeof input !== "object") throw invalid("input must be an object");
  return mergeLibraries(input.base ?? null, input.ours, input.theirs);
}

// impl/library-merge/main.ts
serve(run);
