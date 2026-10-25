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

// impl/bibtex-import/src/index.ts
var WS = /\s/;
var NAME_STOP = /[\s,={}()"#]/;
var MONTHS = {
  jan: "January",
  feb: "February",
  mar: "March",
  apr: "April",
  may: "May",
  jun: "June",
  jul: "July",
  aug: "August",
  sep: "September",
  oct: "October",
  nov: "November",
  dec: "December"
};
var collapse = (s) => s.replace(/\s+/g, " ").trim();
var MARKS = {
  '"': "\u0308",
  "'": "\u0301",
  "`": "\u0300",
  "^": "\u0302",
  "~": "\u0303",
  "=": "\u0304",
  ".": "\u0307",
  c: "\u0327",
  v: "\u030C",
  u: "\u0306",
  H: "\u030B"
};
var ACCENT = /\{?\\(?:(["'`^~=.])|([cvuH])(?=[\s{]))\s*\{?(?:([A-Za-z])|\\([ij])(?![A-Za-z0-9_]))\}?\}?/g;
var SPECIAL_CHARS = {
  ss: "\xDF",
  o: "\xF8",
  O: "\xD8",
  ae: "\xE6",
  AE: "\xC6",
  l: "\u0142",
  L: "\u0141",
  i: "\u0131"
};
var SPECIAL = /\{\\(ss|ae|AE|o|O|l|L|i)\}|\\(ss|ae|AE|o|O|l|L|i)(?![A-Za-z0-9_]) ?/g;
var FORMAT = /\\(?:emph|textit|textbf|mathrm|textrm)\{([^{}]*)\}/g;
var ESCAPED = /\\([&%$#_{}])/g;
var BRACE = /(?<!\\)[{}]/g;
function plain(v) {
  return v.replace(ACCENT, (_m, m1, m2, letter, dotless) => ((letter ?? dotless) + MARKS[m1 ?? m2]).normalize("NFC")).replace(SPECIAL, (_m, a, b) => SPECIAL_CHARS[a ?? b]).replace(FORMAT, "$1").replace(ESCAPED, "$1").replace(BRACE, "").replace(/~/g, " ").replace(/\s+/g, " ").trim();
}
var Reader = class {
  constructor(s) {
    this.s = s;
  }
  s;
  i = 0;
  macros = new Map(Object.entries(MONTHS));
  get eof() {
    return this.i >= this.s.length;
  }
  skipWs() {
    while (this.i < this.s.length && WS.test(this.s[this.i])) this.i++;
  }
  readName() {
    const start = this.i;
    while (this.i < this.s.length && !NAME_STOP.test(this.s[this.i])) this.i++;
    return this.s.slice(start, this.i);
  }
  /** At "{": nested braces, backslash escapes the next character; braces kept inside. */
  readBraced() {
    const s = this.s;
    this.i++;
    const start = this.i;
    let depth = 1;
    while (this.i < s.length) {
      const c = s[this.i];
      if (c === "\\") {
        this.i += 2;
        continue;
      }
      if (c === "{") depth++;
      else if (c === "}" && --depth === 0) {
        const out = s.slice(start, this.i);
        this.i++;
        return out;
      }
      this.i++;
    }
    this.i = s.length;
    return s.slice(start);
  }
  /** At '"': runs to the next '"' outside braces. */
  readQuoted() {
    const s = this.s;
    this.i++;
    const start = this.i;
    let depth = 0;
    while (this.i < s.length) {
      const c = s[this.i];
      if (c === "{") depth++;
      else if (c === "}") depth = Math.max(0, depth - 1);
      else if (c === '"' && depth === 0) {
        const out = s.slice(start, this.i);
        this.i++;
        return out;
      }
      this.i++;
    }
    return s.slice(start);
  }
  /** Parts joined by "#", whitespace collapsed and trimmed. */
  readValue() {
    let out = "";
    this.skipWs();
    for (; ; ) {
      const c = this.s[this.i];
      if (c === "{") out += this.readBraced();
      else if (c === '"') out += this.readQuoted();
      else {
        const word = this.readName();
        if (word && !/^[0-9]+$/.test(word)) out += this.macros.get(word.toLowerCase()) ?? word;
        else out += word;
      }
      this.skipWs();
      if (this.s[this.i] !== "#") break;
      this.i++;
      this.skipWs();
    }
    return collapse(out);
  }
  /** Skip a malformed field up to "," or close; returns true when close was reached (and consumed). */
  skipMalformed(close) {
    const s = this.s;
    while (this.i < s.length) {
      const c = s[this.i];
      if (c === ",") {
        this.i++;
        return false;
      }
      if (c === close) {
        this.i++;
        return true;
      }
      if (c === "{") this.readBraced();
      else if (c === '"') this.readQuoted();
      else this.i++;
    }
    return true;
  }
  readKey(close) {
    const s = this.s;
    const start = this.i;
    let depth = 0;
    while (this.i < s.length) {
      const c = s[this.i];
      if (depth === 0 && (c === "," || c === close)) break;
      if (c === "{") depth++;
      else if (c === "}") depth--;
      this.i++;
    }
    return s.slice(start, this.i).trim();
  }
  readFields(close) {
    const fields = /* @__PURE__ */ new Map();
    const s = this.s;
    for (; ; ) {
      this.skipWs();
      if (this.eof) return fields;
      const c = s[this.i];
      if (c === close) {
        this.i++;
        return fields;
      }
      if (c === ",") {
        this.i++;
        continue;
      }
      const name = this.readName().toLowerCase();
      this.skipWs();
      if (!name || s[this.i] !== "=") {
        if (this.skipMalformed(close)) return fields;
        continue;
      }
      this.i++;
      const value = this.readValue();
      fields.set(name, value);
    }
  }
  entries() {
    const s = this.s;
    const out = [];
    for (; ; ) {
      const at = s.indexOf("@", this.i);
      if (at < 0) return out;
      this.i = at + 1;
      const type = this.readName().toLowerCase();
      this.skipWs();
      const open = s[this.i];
      if (open !== "{" && open !== "(" || type === "comment") {
        this.i = at + 1;
        continue;
      }
      const close = open === "{" ? "}" : ")";
      this.i++;
      if (type === "preamble") {
        this.readValue();
        this.skipWs();
        if (s[this.i] === close) this.i++;
        continue;
      }
      if (type === "string") {
        this.skipWs();
        const name = this.readName().toLowerCase();
        this.skipWs();
        if (s[this.i] === "=") {
          this.i++;
          const value = this.readValue();
          if (name) this.macros.set(name, value);
          this.skipWs();
          if (s[this.i] === close) this.i++;
        } else {
          this.skipMalformed(close);
        }
        continue;
      }
      const key = this.readKey(close);
      let fields = /* @__PURE__ */ new Map();
      if (s[this.i] === close) this.i++;
      else if (s[this.i] === ",") {
        this.i++;
        fields = this.readFields(close);
      }
      if (!key && fields.size === 0) continue;
      out.push({ type, key, fields });
    }
  }
};
function splitAuthors(v) {
  const out = [];
  for (const raw of v.split(/\s+and\s+/i)) {
    const name = plain(raw);
    if (!name) continue;
    const t = raw.trim();
    if (name.includes(",") || name.toLowerCase() === "others" || t.startsWith("{") && t.endsWith("}")) {
      out.push(name);
      continue;
    }
    const words = name.split(" ");
    const last = words.pop();
    out.push(words.length ? `${last}, ${words.join(" ")}` : last);
  }
  return out;
}
var cleanArxiv = (v) => v.replace(/^arxiv:/i, "").replace(/v[0-9]+$/, "");
var ARXIV_URL = /arxiv\.org\/(?:abs|pdf|html)\/([^?#\s]+?)(?:v[0-9]+)?(?:\.pdf)?(?:[?#]|$)/i;
var TAG_ID = /^(?:doi|url|arxiv|isbn|issn|pmid|pmc):/i;
function toDraft(e) {
  const f = e.fields;
  const take = (name) => {
    const v = f.get(name);
    f.delete(name);
    return v;
  };
  const title = plain(take("title") ?? "");
  if (!title) return null;
  let authors = [];
  if (f.has("author")) authors = splitAuthors(take("author"));
  else if (f.has("editor")) authors = splitAuthors(take("editor"));
  let year = null;
  const y = take("year");
  if (y !== void 0) {
    const m = /[0-9]{4}/.exec(y);
    if (m) year = Number(m[0]);
  }
  const journal = plain(take("journal") ?? "");
  let venue = journal || null;
  if (!journal) {
    const booktitle = plain(take("booktitle") ?? "");
    venue = booktitle || plain(f.get("publisher") ?? "") || null;
  }
  const abstract = plain(take("abstract") ?? "") || null;
  const doiRaw = take("doi");
  const doi = doiRaw === void 0 ? null : doiRaw.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "") || null;
  const url = take("url") ?? null;
  const file = take("file") ?? null;
  let notes;
  if (f.has("annote")) notes = take("annote");
  else notes = take("note") ?? null;
  let arxiv = null;
  const arxivid = f.get("arxivid");
  const eprint = f.get("eprint");
  const prefix = (f.get("archiveprefix") ?? "").toLowerCase() === "arxiv" || (f.get("eprinttype") ?? "").toLowerCase() === "arxiv";
  if (arxivid) arxiv = cleanArxiv(arxivid);
  else if (eprint && prefix) arxiv = cleanArxiv(eprint);
  else {
    const m = url ? ARXIV_URL.exec(url) : null;
    if (m) arxiv = cleanArxiv(m[1]);
    else if (eprint && /^[0-9]{4}\.[0-9]{4}/.test(eprint)) arxiv = cleanArxiv(eprint);
  }
  if (arxiv !== null) {
    for (const n of ["arxivid", "eprint", "archiveprefix", "eprinttype", "primaryclass"]) f.delete(n);
  }
  const tags = [];
  const kw = take("keywords");
  if (kw !== void 0) {
    for (const part of kw.split(/[;,]/)) {
      const t = plain(part);
      if (!t || TAG_ID.test(t) || t.includes("http://") || t.includes("https://")) continue;
      tags.push(t);
    }
  }
  return {
    key: e.key,
    type: e.type,
    title,
    authors,
    year,
    venue,
    abstract,
    doi,
    arxiv,
    url,
    tags,
    file,
    notes,
    fields: Object.fromEntries(f)
  };
}
function importBibtex(text) {
  const out = [];
  for (const e of new Reader(text).entries()) {
    const d = toDraft(e);
    if (d) out.push(d);
  }
  return out;
}
function run(input) {
  return { papers: importBibtex(input.text) };
}

// impl/bibtex-import/main.ts
serve(run);
