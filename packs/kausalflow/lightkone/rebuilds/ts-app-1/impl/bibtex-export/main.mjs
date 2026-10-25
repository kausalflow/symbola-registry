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
function run(input) {
  return { text: exportBibtex(input.paper) };
}

// impl/bibtex-export/main.ts
serve(run);
