// lightkone/bibtex-import@1: BibTeX text -> paper drafts.
// Pure module: no Node or DOM APIs. "Whitespace" is JavaScript's \s throughout.

/** A paper before the library gives it an id. Absent fields are null. */
export interface Draft {
  key: string;
  type: string;
  title: string;
  authors: string[];
  year: number | null;
  venue: string | null;
  abstract: string | null;
  doi: string | null;
  arxiv: string | null;
  url: string | null;
  tags: string[];
  file: string | null;
  notes: string | null;
  /** Remaining BibTeX fields: lower-cased names, values as written (collapsed). */
  fields: Record<string, string>;
}

const WS = /\s/;
/** Characters that end an entry type, field name, macro name or bare word. */
const NAME_STOP = /[\s,={}()"#]/;

const MONTHS: Record<string, string> = {
  jan: "January", feb: "February", mar: "March", apr: "April", may: "May", jun: "June",
  jul: "July", aug: "August", sep: "September", oct: "October", nov: "November", dec: "December",
};

const collapse = (s: string): string => s.replace(/\s+/g, " ").trim();

// ── plain() ──────────────────────────────────────────────────────────────

const MARKS: Record<string, string> = {
  '"': "̈", "'": "́", "`": "̀", "^": "̂", "~": "̃", "=": "̄",
  ".": "̇", c: "̧", v: "̌", u: "̆", H: "̋",
};
const ACCENT =
  /\{?\\(?:(["'`^~=.])|([cvuH])(?=[\s{]))\s*\{?(?:([A-Za-z])|\\([ij])(?![A-Za-z0-9_]))\}?\}?/g;
const SPECIAL_CHARS: Record<string, string> = {
  ss: "ß", o: "ø", O: "Ø", ae: "æ", AE: "Æ", l: "ł", L: "Ł", i: "ı",
};
const SPECIAL = /\{\\(ss|ae|AE|o|O|l|L|i)\}|\\(ss|ae|AE|o|O|l|L|i)(?![A-Za-z0-9_]) ?/g;
const FORMAT = /\\(?:emph|textit|textbf|mathrm|textrm)\{([^{}]*)\}/g;
const ESCAPED = /\\([&%$#_{}])/g;
const BRACE = /(?<!\\)[{}]/g;

/** LaTeX to plain Unicode text, as lightkone does for titles, venues, names and tags. */
export function plain(v: string): string {
  return v
    .replace(ACCENT, (_m, m1: string | undefined, m2: string | undefined, letter: string | undefined, dotless: string | undefined) =>
      ((letter ?? dotless) + MARKS[(m1 ?? m2)!]).normalize("NFC"))
    .replace(SPECIAL, (_m, a: string | undefined, b: string | undefined) => SPECIAL_CHARS[(a ?? b)!])
    .replace(FORMAT, "$1")
    .replace(ESCAPED, "$1")
    .replace(BRACE, "")
    .replace(/~/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── reading entries ──────────────────────────────────────────────────────

interface RawEntry {
  type: string;
  key: string;
  fields: Map<string, string>;
}

class Reader {
  i = 0;
  readonly macros = new Map<string, string>(Object.entries(MONTHS));
  constructor(readonly s: string) {}

  get eof(): boolean {
    return this.i >= this.s.length;
  }
  skipWs(): void {
    while (this.i < this.s.length && WS.test(this.s[this.i])) this.i++;
  }
  readName(): string {
    const start = this.i;
    while (this.i < this.s.length && !NAME_STOP.test(this.s[this.i])) this.i++;
    return this.s.slice(start, this.i);
  }

  /** At "{": nested braces, backslash escapes the next character; braces kept inside. */
  readBraced(): string {
    const s = this.s;
    this.i++; // "{"
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
  readQuoted(): string {
    const s = this.s;
    this.i++; // '"'
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
  readValue(): string {
    let out = "";
    this.skipWs();
    for (;;) {
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
  skipMalformed(close: string): boolean {
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

  readKey(close: string): string {
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

  readFields(close: string): Map<string, string> {
    const fields = new Map<string, string>();
    const s = this.s;
    for (;;) {
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
      this.i++; // "="
      const value = this.readValue();
      fields.set(name, value); // a later field replaces the earlier one (keeping its place)
    }
  }

  entries(): RawEntry[] {
    const s = this.s;
    const out: RawEntry[] = [];
    for (;;) {
      const at = s.indexOf("@", this.i);
      if (at < 0) return out;
      this.i = at + 1;
      const type = this.readName().toLowerCase();
      this.skipWs();
      const open = s[this.i];
      if ((open !== "{" && open !== "(") || type === "comment") {
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
      let fields = new Map<string, string>();
      if (s[this.i] === close) this.i++;
      else if (s[this.i] === ",") {
        this.i++;
        fields = this.readFields(close);
      }
      if (!key && fields.size === 0) continue;
      out.push({ type, key, fields });
    }
  }
}

// ── drafts ───────────────────────────────────────────────────────────────

function splitAuthors(v: string): string[] {
  const out: string[] = [];
  for (const raw of v.split(/\s+and\s+/i)) {
    const name = plain(raw);
    if (!name) continue;
    const t = raw.trim();
    if (name.includes(",") || name.toLowerCase() === "others" || (t.startsWith("{") && t.endsWith("}"))) {
      out.push(name);
      continue;
    }
    const words = name.split(" ");
    const last = words.pop()!;
    out.push(words.length ? `${last}, ${words.join(" ")}` : last);
  }
  return out;
}

const cleanArxiv = (v: string): string => v.replace(/^arxiv:/i, "").replace(/v[0-9]+$/, "");
const ARXIV_URL = /arxiv\.org\/(?:abs|pdf|html)\/([^?#\s]+?)(?:v[0-9]+)?(?:\.pdf)?(?:[?#]|$)/i;
const TAG_ID = /^(?:doi|url|arxiv|isbn|issn|pmid|pmc):/i;

function toDraft(e: RawEntry): Draft | null {
  const f = e.fields;
  const take = (name: string): string | undefined => {
    const v = f.get(name);
    f.delete(name);
    return v;
  };

  const title = plain(take("title") ?? "");
  if (!title) return null;

  let authors: string[] = [];
  if (f.has("author")) authors = splitAuthors(take("author")!);
  else if (f.has("editor")) authors = splitAuthors(take("editor")!);

  let year: number | null = null;
  const y = take("year");
  if (y !== undefined) {
    const m = /[0-9]{4}/.exec(y);
    if (m) year = Number(m[0]);
  }

  const journal = plain(take("journal") ?? "");
  let venue: string | null = journal || null;
  if (!journal) {
    const booktitle = plain(take("booktitle") ?? "");
    venue = booktitle || plain(f.get("publisher") ?? "") || null;
  }

  const abstract = plain(take("abstract") ?? "") || null;

  const doiRaw = take("doi");
  const doi = doiRaw === undefined ? null : doiRaw.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "") || null;

  const url = take("url") ?? null;
  const file = take("file") ?? null;

  let notes: string | null;
  if (f.has("annote")) notes = take("annote")!;
  else notes = take("note") ?? null;

  let arxiv: string | null = null;
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

  const tags: string[] = [];
  const kw = take("keywords");
  if (kw !== undefined) {
    for (const part of kw.split(/[;,]/)) {
      const t = plain(part);
      if (!t || TAG_ID.test(t) || t.includes("http://") || t.includes("https://")) continue;
      tags.push(t);
    }
  }

  return {
    key: e.key, type: e.type, title, authors, year, venue, abstract, doi, arxiv, url, tags, file, notes,
    fields: Object.fromEntries(f),
  };
}

/** Read BibTeX text into drafts, one per entry with a title, in order. Never throws. */
export function importBibtex(text: string): Draft[] {
  const out: Draft[] = [];
  for (const e of new Reader(text).entries()) {
    const d = toDraft(e);
    if (d) out.push(d);
  }
  return out;
}

/** Harness entry point: {text} -> {papers}. */
export function run(input: { text: string }): { papers: Draft[] } {
  return { papers: importBibtex(input.text) };
}
