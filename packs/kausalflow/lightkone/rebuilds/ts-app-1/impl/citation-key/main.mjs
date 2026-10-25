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

// impl/citation-key/src/index.ts
function base(d) {
  const authors = d.authors ?? [];
  const raw = authors.length ? String(authors[0]).split(",")[0] : "";
  let last = raw.normalize("NFKD").replace(/[^A-Za-z]/g, "");
  if (!last) last = "Anon";
  const year = d.year === null || d.year === void 0 ? "" : String(d.year);
  return last[0].toUpperCase() + last.slice(1) + year;
}
function suffix(d) {
  const words = String(d.title ?? "").toLowerCase().replace(/[^a-z ]/g, "").split(" ").filter((w) => w.length > 3);
  if (!words.length) return "xx";
  return words[0][0] + (words.length > 1 ? words[1] : words[0])[0];
}
function baseKey(d) {
  return `${base(d)}-${suffix(d)}`;
}
function assignKeys(drafts, taken = []) {
  const used = new Set(taken);
  const out = [];
  for (const d of drafts) {
    let key;
    if (typeof d.key === "string" && d.key !== "" && !used.has(d.key)) {
      key = d.key;
    } else {
      const first = baseKey(d);
      key = first;
      for (let i = 2; used.has(key); i++) key = `${first}${i}`;
    }
    used.add(key);
    out.push(key);
  }
  return out;
}
function run(input) {
  return { keys: assignKeys(input.drafts ?? [], input.taken ?? []) };
}

// impl/citation-key/main.ts
serve(run);
