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

// impl/search-query/src/index.ts
var SORTS = ["added", "year", "title", "relevance", "opened"];
function fold(text) {
  return text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
var FIELDS = /* @__PURE__ */ new Set(["tag", "author", "year", "in", "has", "no", "is"]);
var TOKEN = /(\w+):"([^"]*)"|(\w+):(\S+)|"([^"]*)"|(\S+)/g;
var YEAR_NUMBER = /^[0-9]+(?:\.[0-9]+)?$/;
function yearNumber(s) {
  if (s === void 0 || !YEAR_NUMBER.test(s)) return NaN;
  return Number(s);
}
function parseYear(value) {
  const parts = value.split("-");
  const lo = yearNumber(parts[0]);
  if (!(lo > 0)) return null;
  const b = yearNumber(parts[1]);
  const hi = b > 0 ? b : lo;
  return { lo, hi };
}
function parseQuery(query) {
  const q = {
    words: [],
    tags: [],
    authors: [],
    folders: [],
    has: [],
    no: [],
    is: [],
    trash: false,
    recent: false,
    year: null
  };
  for (const m of query.matchAll(TOKEN)) {
    const fieldRaw = m[1] ?? m[3];
    if (fieldRaw !== void 0) {
      const field = fieldRaw.toLowerCase();
      if (!FIELDS.has(field)) {
        q.words.push(fold(m[0]));
        continue;
      }
      const value = m[2] ?? m[4];
      const v = fold(value);
      switch (field) {
        case "tag":
          q.tags.push(v);
          break;
        case "author":
          q.authors.push(v);
          break;
        case "in":
          q.folders.push(v.replace(/\/+$/, ""));
          break;
        case "has":
          q.has.push(v);
          break;
        case "no":
          q.no.push(v);
          break;
        case "is":
          if (v === "trash") q.trash = true;
          else if (v === "recent") q.recent = true;
          q.is.push(v);
          break;
        case "year": {
          const y = parseYear(v);
          if (y) q.year = y;
          break;
        }
      }
      continue;
    }
    q.words.push(fold(m[5] ?? m[6]));
  }
  return q;
}
var present = (x) => !!x;
function list(x) {
  return Array.isArray(x) ? x : [];
}
function texts(p) {
  const rest = [p.abstract, p.venue, list(p.tags).join(" "), p.key, p.doi, p.arxiv, p.notes].filter((x) => typeof x === "string" && x !== "").join(" ");
  return {
    title: fold(p.title ?? ""),
    authors: fold(list(p.authors).join(" ; ")),
    rest: fold(rest)
  };
}
var HAS = {
  pdf: (p) => present(p.pdf) || present(p.file),
  abstract: (p) => present(p.abstract),
  arxiv: (p) => present(p.arxiv),
  notes: (p) => present(p.notes)
};
var NO = {
  pdf: (p) => !present(p.pdf),
  abstract: (p) => !present(p.abstract),
  arxiv: (p) => !present(p.arxiv),
  notes: (p) => !present(p.notes)
};
var IS = {
  starred: (p) => p.starred === true,
  recent: (p) => present(p.opened),
  trash: (p) => present(p.trashed)
};
function passesFilters(p, q, authorText) {
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
function wordScore(t, w) {
  return (t.title.includes(w) ? 5 : 0) + (t.authors.includes(w) ? 4 : 0) + (t.rest.includes(w) ? 1 : 0);
}
var collator = null;
function titleCompare(a, b) {
  collator ??= new Intl.Collator("und", { usage: "sort", sensitivity: "variant" });
  return collator.compare(a, b);
}
var desc = (a, b) => a < b ? 1 : a > b ? -1 : 0;
function effectiveOrder(sort, q) {
  if (sort !== "added") return sort;
  if (q.recent) return "opened";
  if (q.words.length) return "relevance";
  return "added";
}
function order(hits, how) {
  const byAdded = (a, b) => desc(a.paper.added, b.paper.added);
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
function normalizeSort(sort) {
  return sort && SORTS.includes(sort) ? sort : "added";
}
function searchWithFullText(papers, query, sort, hasAllWordsInText) {
  const q = parseQuery(query);
  const hits = [];
  for (const paper of papers) {
    const t = texts(paper);
    if (!passesFilters(paper, q, t.authors)) continue;
    let score = 0;
    let missed = false;
    for (const w of q.words) {
      const s = wordScore(t, w);
      if (!s) {
        missed = true;
        break;
      }
      score += s;
    }
    if (!missed) hits.push({ paper, score, tier: 0 });
    else if (hasAllWordsInText(paper.id, q.words.slice())) hits.push({ paper, score: 0, tier: 1 });
  }
  return order(hits, effectiveOrder(normalizeSort(sort), q)).map((h) => h.paper.id);
}
function search(papers, query, sort) {
  return searchWithFullText(papers, query, sort, () => false);
}
function reject(message) {
  const e = new Error(message);
  e.name = "ValueError";
  throw e;
}
function run(input) {
  if (!input || typeof input !== "object") reject("input must be an object");
  const { papers, query } = input;
  const sort = input.sort ?? "added";
  if (!Array.isArray(papers)) reject("papers must be a list");
  if (typeof query !== "string") reject("query must be a string");
  if (!SORTS.includes(sort)) reject(`unknown sort: ${String(sort)}`);
  const seen = /* @__PURE__ */ new Set();
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

// impl/search-query/main.ts
serve(run);
