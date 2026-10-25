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

// impl/pdf-filing/src/index.ts
function clean(s) {
  return s.replace(/---/g, "\u2014").replace(/--/g, "\u2013").replace(/[:/\\?*"<>|]/g, " - ").replace(/\s+/g, " ").replace(/( - )+/g, " - ").replace(/^[ -]+|[ -]+$/g, "");
}
function surname(a) {
  const i = a.indexOf(",");
  return (i < 0 ? a : a.slice(0, i)).trim();
}
function folderFor(authors) {
  const first = authors?.[0];
  if (first === void 0 || first === null) return "Other";
  return clean(surname(first)).toUpperCase() || "Other";
}
function nameFor(paper) {
  const title = clean(String(paper.title ?? "")) || "Untitled";
  const names = (paper.authors ?? []).map(surname).filter((s) => s);
  let who = names.length === 0 ? title : names.length === 1 ? names[0] : names.length === 2 ? `${names[0]} and ${names[1]}` : `${names[0]} et al.`;
  if (who.length > 40) who = who.slice(0, 37) + "...";
  const hasYear = paper.year !== void 0 && paper.year !== null && paper.year !== "";
  const head = hasYear ? clean(who + " " + paper.year) : clean(who);
  let name = head + " - " + title;
  if (name.length > 146) name = name.slice(0, 72).trimEnd() + " ... " + name.slice(-69).trimStart();
  return name;
}
function filePdf(paper, library = []) {
  const taken = /* @__PURE__ */ new Set();
  for (const other of library) {
    if (other.id === paper.id) continue;
    if (other.pdf) taken.add(other.pdf);
    if (other.file) for (const part of other.file.split(";")) taken.add("papers/" + part.trim());
  }
  const base = `All Papers/${folderFor(paper.authors)}/${nameFor(paper)}`;
  let file = base + ".pdf";
  for (let n = 2; taken.has("papers/" + file); n++) file = `${base} (${n}).pdf`;
  return { pdf: "papers/" + file, file };
}
function run(input) {
  return filePdf(input.paper, input.library ?? []);
}

// impl/pdf-filing/main.ts
serve(run);
