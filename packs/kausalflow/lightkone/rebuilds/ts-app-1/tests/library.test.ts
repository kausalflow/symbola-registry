// The app's save loop and add flow, on in-memory storage.
import assert from "node:assert/strict";
import { test } from "node:test";
import { run as fileRun } from "../impl/library-file/src/index.ts";
import { addDrafts, addText, findDuplicate } from "../src/core/add.ts";
import { LibraryStore } from "../src/core/library.ts";
import { MemoryStorage } from "../src/core/storage/memory.ts";
import { LIBRARY_BIB, LIBRARY_JSON } from "../src/core/types.ts";

const text = (s: MemoryStorage, p: string) => {
  const b = s.files.get(p);
  return b ? new TextDecoder().decode(b) : null;
};
const net = { direct: () => Promise.reject(new TypeError("offline")), passThrough: () => Promise.reject(new TypeError("offline")) };

const BIB = `@article{Hinton2012-ip,
  title = {Improving neural networks by preventing co-adaptation of feature detectors},
  author = {Hinton, Geoffrey E. and Srivastava, Nitish},
  year = {2012},
  journal = {arXiv},
  eprint = {1207.0580},
  archiveprefix = {arXiv},
  file = {All Papers/HINTON/Hinton et al. 2012 - Improving neural networks.pdf},
  keywords = {dropout; neural networks}
}
@inproceedings{LeCun1998,
  title = {Gradient-based learning applied to document recognition},
  author = {LeCun, Yann and Bottou, L{\\'e}on},
  booktitle = {Proceedings of the IEEE},
  year = 1998,
  doi = {https://doi.org/10.1109/5.726791}
}`;

test("import, then save: library.json is what library-file writes, with library.bib", async () => {
  const s = new MemoryStorage();
  const store = new LibraryStore(s);
  assert.equal(await store.open(), false);
  const r = await addText({ store, ctx: { net }, fetchPdfs: false }, BIB);
  assert.equal(r.added.length, 2);
  assert.deepEqual(r.added.map((p) => p.key), ["Hinton2012-ip", "LeCun1998"]);
  assert.equal(r.added[0].arxiv, "1207.0580");
  assert.deepEqual(r.added[0].tags, ["dropout", "neural networks"]);
  assert.equal(r.added[1].doi, "10.1109/5.726791");
  assert.equal(r.added[1].authors[1], "Bottou, Léon");
  await store.save();
  const json = text(s, LIBRARY_JSON)!;
  // Opening and saving again changes nothing: it is exactly lightkone's text.
  const again = fileRun({ text: json });
  assert.equal(again.written, false);
  assert.equal(text(s, LIBRARY_BIB), fileRun({ text: json.replace('"version": 1', '"version": 0') }).bib);
  assert.match(text(s, LIBRARY_BIB)!, /^@article\{Hinton2012-ip,/);
});

test("importing the same .bib twice adds nothing and changes no key", async () => {
  const s = new MemoryStorage();
  const store = new LibraryStore(s);
  await store.open();
  await addText({ store, ctx: { net }, fetchPdfs: false }, BIB);
  const keys = store.papers.map((p) => p.key);
  const r = await addText({ store, ctx: { net }, fetchPdfs: false }, BIB);
  assert.equal(r.added.length, 0);
  assert.equal(r.existing.length, 2);
  assert.deepEqual(store.papers.map((p) => p.key), keys);
});

test("the add duplicate rule: DOI, arXiv id, key, long title; fills only what is missing", async () => {
  const store = new LibraryStore(new MemoryStorage());
  await store.open();
  addDrafts(store, [{ title: "Attention is all you need", authors: ["Vaswani, Ashish"], year: 2017, arxiv: "1706.03762", tags: ["nlp"] }]);
  const p = store.papers[0];
  p.trashed = "2024-01-01T00:00:00.000Z";
  // Trashed papers count; arXiv id with a version and prefix is the same paper.
  assert.equal(findDuplicate(store.papers, { title: "x", arxiv: "arXiv:1706.03762v5" }), p);
  // Long title, lower-cased, punctuation stripped.
  assert.equal(findDuplicate(store.papers, { title: "ATTENTION IS ALL YOU NEED!" }), p);
  // Short titles do not count.
  addDrafts(store, [{ title: "Short one", key: "Short2020" }]);
  assert.equal(findDuplicate(store.papers, { title: "short one" }), undefined);
  assert.equal(findDuplicate(store.papers, { title: "other", key: "Short2020" })?.title, "Short one");
  const r = addDrafts(store, [{ title: "Attention Is All You Need", doi: "10.5555/3295222", venue: "NeurIPS", year: 1999, tags: ["transformers"], folders: ["ML"] }]);
  assert.equal(r.added.length, 0);
  assert.equal(p.doi, "10.5555/3295222");
  assert.equal(p.venue, "NeurIPS");
  assert.equal(p.year, 2017, "year is kept when present");
  assert.deepEqual(p.tags, ["nlp", "transformers"]);
  assert.deepEqual(p.folders, ["ML"]);
  assert.equal(p.title, "Attention is all you need", "nothing else changes");
});

test("a taken key counts up; an arriving free key is kept", async () => {
  const store = new LibraryStore(new MemoryStorage());
  await store.open();
  addDrafts(store, [{ title: "Deep learning of things", authors: ["Smith, J"], year: 2020 }]);
  addDrafts(store, [{ title: "Deep learning of other things entirely", authors: ["Smith, J"], year: 2020 }]);
  addDrafts(store, [{ title: "Something", key: "MyOwnKey" }]);
  assert.deepEqual(store.papers.map((p) => p.key), ["Smith2020-dl", "Smith2020-dl2", "MyOwnKey"]);
});

test("two devices: every save merges, nobody's edit is lost", async () => {
  const s = new MemoryStorage();
  const a = new LibraryStore(s);
  await a.open();
  addDrafts(a, [
    { title: "Paper one about something long", tags: ["x"] },
    { title: "Paper two about something long", tags: [] },
  ]);
  await a.save();
  const b = new LibraryStore(s);
  await b.open();
  // A tags paper one and stars paper two; B edits paper one's notes and adds a paper.
  a.papers[0].tags.push("from-a");
  a.papers[1].starred = true;
  b.papers[0].notes = "from b";
  addDrafts(b, [{ title: "Paper three, only on device b" }]);
  const sa = await a.save();
  const sb = await b.save();
  assert.equal(sa.fromThem, 0);
  assert.equal(sb.fromThem, 2, "b took a's two changes");
  const c = new LibraryStore(s);
  await c.open();
  assert.equal(c.papers.length, 3);
  assert.deepEqual(c.papers[0].tags, ["x", "from-a"]);
  assert.equal(c.papers[0].notes, "from b");
  assert.equal(c.papers[1].starred, true);
  // A picks up b's changes when it comes back.
  assert.equal(await a.refresh(), 2);
  assert.equal(a.papers.length, 3);
  assert.equal(a.papers[0].notes, "from b");
});

test("nothing is written when nothing changed (no sync churn)", async () => {
  const s = new MemoryStorage();
  const a = new LibraryStore(s);
  await a.open();
  addDrafts(a, [{ title: "Only paper in the library" }]);
  await a.save();
  s.writes = [];
  const b = new LibraryStore(s);
  await b.open();
  const r = await b.save();
  assert.equal(r.written, false);
  assert.deepEqual(s.writes, []);
});

test("a read-only storage opens the library read-only", async () => {
  const s = new MemoryStorage("read");
  s.files.set(LIBRARY_JSON, new TextEncoder().encode('{"format":"lightkone-library","version":1,"papers":[]}'));
  const store = new LibraryStore(s);
  await store.open();
  assert.equal(store.readOnly, true);
  await assert.rejects(store.save(), /read-only/);
});

test("a newer library.json is refused, and nothing is written", async () => {
  const s = new MemoryStorage();
  s.files.set(LIBRARY_JSON, new TextEncoder().encode('{"format":"lightkone-library","version":2,"papers":[]}'));
  const store = new LibraryStore(s);
  await assert.rejects(store.open());
  assert.deepEqual(s.writes, []);
});

test("Paperpile papers land in the folders their file paths name", async () => {
  const store = new LibraryStore(new MemoryStorage());
  await store.open();
  await addText(
    { store, ctx: { net }, fetchPdfs: false },
    `@article{a, title={A title long enough to be unique here}, author={Doe, Jane}, file={All Papers/Physics/QFT/DOE/Doe 2020 - A.pdf;All Papers/DOE/Doe 2020 - A.pdf}}`,
  );
  // A lone author folder (DOE) is skipped; deeper paths are kept whole.
  assert.deepEqual(store.papers[0].folders, ["Physics/QFT/DOE"]);
});
