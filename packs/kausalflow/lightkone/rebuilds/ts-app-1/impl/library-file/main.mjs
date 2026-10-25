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

// impl/bibtex-export/src/index.ts
var present = (v) => v !== void 0 && v !== null && v !== "";
function escapeSpecial(s) {
  return s.replace(/\\?([&%#])/g, "\\$1");
}
function author(a) {
  return a.includes(",") || a === "others" ? a : "{" + a + "}";
}
function exportBibtex(paper) {
  const type = paper.type || "misc";
  const fields = paper.fields ?? {};
  const authors = paper.authors ?? [];
  const tags = paper.tags ?? [];
  const venueField = type === "inproceedings" || type === "incollection" ? "booktitle" : "journal";
  const out = [];
  out.push(["title", "{" + escapeSpecial(String(paper.title ?? "")) + "}"]);
  if (authors.length) out.push(["author", authors.map(author).join(" and ")]);
  if (paper.year !== void 0 && paper.year !== null) out.push(["year", String(paper.year)]);
  if (present(paper.venue) && !fields[venueField]) out.push([venueField, escapeSpecial(String(paper.venue))]);
  if (present(paper.doi)) out.push(["doi", String(paper.doi)]);
  if (present(paper.arxiv)) {
    out.push(["eprint", String(paper.arxiv)]);
    out.push(["archiveprefix", "arXiv"]);
  }
  if (present(paper.url)) out.push(["url", String(paper.url)]);
  if (present(paper.abstract)) out.push(["abstract", escapeSpecial(String(paper.abstract))]);
  const keywords = tags.join(";");
  if (keywords) out.push(["keywords", keywords]);
  if (present(paper.file)) out.push(["file", String(paper.file)]);
  for (const [name, value] of Object.entries(fields)) {
    if (value && !name.startsWith("lightkone-")) out.push([name, String(value)]);
  }
  const width = Math.max(...out.map(([n]) => n.length));
  const lines = out.map(([n, v]) => "  " + n.padEnd(width) + " = {" + v + "}");
  return "@" + type + "{" + (paper.key ?? "") + ",\n" + lines.join(",\n") + "\n}\n";
}

// impl/pdf-filing/src/index.ts
function clean(s) {
  return s.replace(/---/g, "\u2014").replace(/--/g, "\u2013").replace(/[:/\\?*"<>|]/g, " - ").replace(/\s+/g, " ").replace(/( - )+/g, " - ").replace(/^[ -]+|[ -]+$/g, "");
}
function surname(a) {
  const i = a.indexOf(",");
  return (i < 0 ? a : a.slice(0, i)).trim();
}

// impl/library-file/src/index.ts
var ValueError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ValueError";
  }
};
var FORMAT = "lightkone-library";
var VERSION = 1;
var isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
function foldersFromFile(file, authors = []) {
  const names = /* @__PURE__ */ new Set();
  for (const a of authors) {
    if (typeof a !== "string") continue;
    const n = clean(surname(a)).toUpperCase();
    if (n) names.add(n);
  }
  const isAuthorFolder = (d) => d === "Other" || (names.size ? names.has(d) : d === d.toUpperCase() && d !== d.toLowerCase());
  const out = [];
  if (typeof file !== "string") return out;
  for (const raw of file.split(";")) {
    const path = raw.trim();
    if (!path) continue;
    let dirs = path.split("/").slice(0, -1);
    if (dirs[0] === "All Papers") dirs = dirs.slice(1);
    if (dirs.length === 0 || dirs.length === 1 && isAuthorFolder(dirs[0])) continue;
    const f = dirs.join("/");
    if (!out.includes(f)) out.push(f);
  }
  return out;
}
function loadLibrary(text) {
  let data;
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
  for (const p of data.papers) {
    if ("folders" in p) continue;
    p.folders = foldersFromFile(p.file, Array.isArray(p.authors) ? p.authors : []);
    if (p.folders.length) foldered++;
  }
  return { data, foldered };
}
function serializeLibrary(data) {
  const out = { format: FORMAT, version: VERSION, papers: data.papers };
  if (Array.isArray(data.bibSync) && data.bibSync.length) out.bibSync = data.bibSync;
  for (const k of Object.keys(data)) {
    if (k === "format" || k === "version" || k === "papers" || k === "bibSync") continue;
    out[k] = data[k];
  }
  return JSON.stringify(out, null, 1);
}
function libraryBib(papers) {
  return papers.filter((p) => !p.trashed).map((p) => exportBibtex(p)).join("\n");
}
function saveLibrary(data, storedText) {
  const library = serializeLibrary(data);
  if (storedText !== null && library === storedText) return { written: false, library: storedText, bib: null };
  return { written: true, library, bib: libraryBib(data.papers) };
}
function run(input) {
  const { data, foldered } = loadLibrary(input.text);
  return { ...saveLibrary(data, input.text), foldered };
}

// impl/library-file/main.ts
serve(run);
