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

// impl/tidy/src/index.ts
var FILL = ["abstract", "doi", "arxiv", "url", "venue", "year", "pdf", "file", "opened"];
function invalid(message) {
  const e = new Error(message);
  e.name = "ValueError";
  return e;
}
function put(o, k, v) {
  Object.defineProperty(o, k, { value: v, enumerable: true, writable: true, configurable: true });
}
var str = (v) => typeof v === "string" ? v : v === null || v === void 0 ? "" : String(v);
var list = (v) => Array.isArray(v) ? v : [];
function normDoi(s) {
  return str(s).trim().toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, "");
}
function normArxiv(s) {
  return str(s).trim().toLowerCase().replace(/^arxiv:/, "").replace(/v\d+$/, "");
}
function normTitle(s) {
  return str(s).normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "");
}
function firstAuthor(p) {
  const authors = list(p.authors);
  const first = authors.length ? str(authors[0]).split(",")[0] : "";
  return first.normalize("NFKD").toLowerCase().replace(/[^a-z]/g, "");
}
function matchKeys(p) {
  const out = [];
  const doi = normDoi(p.doi);
  if (doi) out.push("doi:" + doi);
  const arxiv = normArxiv(p.arxiv);
  if (arxiv) out.push("arxiv:" + arxiv);
  const t = normTitle(p.title);
  if (t.length > 20) out.push("title:" + t);
  else if (t.length > 3) out.push(`title:${t}:${firstAuthor(p)}`);
  return out;
}
function validate(papers) {
  if (!Array.isArray(papers)) throw invalid("papers must be a list");
  const seen = /* @__PURE__ */ new Set();
  for (const p of papers) {
    if (!p || typeof p !== "object" || Array.isArray(p)) throw invalid("a paper is not an object");
    const id = p.id;
    if (typeof id !== "string" || !id) throw invalid("every paper needs a non-empty string id");
    if (seen.has(id)) throw invalid("paper ids must be unique");
    seen.add(id);
  }
  return papers;
}
function keeperOf(group) {
  let best = group[0];
  const rank = (p) => [p.pdf ? 0 : 1, p.notes ? 0 : 1];
  for (const p of group.slice(1)) {
    const [ap, an] = rank(p), [bp, bn] = rank(best);
    if (ap !== bp ? ap < bp : an !== bn ? an < bn : str(p.added) < str(best.added)) best = p;
  }
  return best;
}
function unique(items) {
  return [...new Set(items)];
}
function patchFor(keep, others) {
  const everyone = [keep, ...others];
  const notes = unique(everyone.map((p) => typeof p.notes === "string" ? p.notes.trim() : "").filter(Boolean));
  const fields = {};
  for (const p of [...everyone].reverse()) {
    const f = p.fields;
    if (f && typeof f === "object" && !Array.isArray(f)) for (const [k, v] of Object.entries(f)) put(fields, k, v);
  }
  let added = str(keep.added);
  for (const p of others) if (str(p.added) < added) added = str(p.added);
  const patch = {
    tags: unique(everyone.flatMap((p) => list(p.tags))),
    folders: unique(everyone.flatMap((p) => list(p.folders)))
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
  return patch;
}
function findDuplicates(input) {
  const papers = validate(input);
  const live = papers.filter((p) => !p.trashed);
  const parent = live.map((_, i) => i);
  const find = (i) => {
    while (parent[i] !== i) i = parent[i] = parent[parent[i]];
    return i;
  };
  const owner = /* @__PURE__ */ new Map();
  live.forEach((p, i) => {
    for (const k of matchKeys(p)) {
      const j = owner.get(k);
      if (j === void 0) owner.set(k, i);
      else {
        const a = find(i), b = find(j);
        if (a !== b) parent[Math.max(a, b)] = Math.min(a, b);
      }
    }
  });
  const members = /* @__PURE__ */ new Map();
  live.forEach((p, i) => {
    const r = find(i);
    const m = members.get(r);
    if (m) m.push(p);
    else members.set(r, [p]);
  });
  const groups = [];
  for (const group of members.values()) {
    if (group.length < 2) continue;
    const keep = keeperOf(group);
    groups.push({ ids: group.map((p) => p.id), keep: keep.id, patch: patchFor(keep, group.filter((p) => p !== keep)) });
  }
  return groups;
}
function run(input) {
  if (!input || typeof input !== "object") throw invalid("input must be an object");
  return { groups: findDuplicates(input.papers) };
}

// impl/tidy/main.ts
serve(run);
