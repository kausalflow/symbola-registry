import { createInterface } from "node:readline";

//#region src/core/bibtex.ts
const escape = (v) => v.replace(/\\?([&%#])/g, "\\$1");
function paperToBibtex(p) {
	const lines = [];
	const add = (name, value) => {
		if (value !== void 0 && value !== "") lines.push([name, String(value)]);
	};
	add("title", `{${escape(p.title)}}`);
	add("author", p.authors.map((a) => a.includes(",") || a === "others" ? a : `{${a}}`).join(" and "));
	add("year", p.year);
	const venueField = p.type === "inproceedings" || p.type === "incollection" ? "booktitle" : "journal";
	if (p.venue && !p.fields[venueField]) add(venueField, escape(p.venue));
	add("doi", p.doi);
	if (p.arxiv) {
		add("eprint", p.arxiv);
		add("archiveprefix", "arXiv");
	}
	add("url", p.url);
	add("abstract", p.abstract && escape(p.abstract));
	if (p.tags.length) add("keywords", p.tags.join(";"));
	add("file", p.file);
	for (const [k, v] of Object.entries(p.fields)) if (!k.startsWith("lightkone-")) add(k, v);
	const width = Math.max(...lines.map(([k]) => k.length));
	const body = lines.map(([k, v]) => `  ${k.padEnd(width)} = {${v}}`).join(",\n");
	return `@${p.type || "misc"}{${p.key},\n${body}\n}\n`;
}
const libraryToBibtex = (papers) => papers.map(paperToBibtex).join("\n");

//#endregion
//#region src/core/filing.ts
const surname = (a) => (a.includes(",") ? a.split(",")[0] : a).trim();
/** Characters a file name cannot hold become " - ", as Paperpile does ("Title: Subtitle" → "Title - Subtitle"). */
function clean(s) {
	return s.replace(/---/g, "—").replace(/--/g, "–").replace(/[:/\\?*"<>|]/g, " - ").replace(/\s+/g, " ").replace(/( - )+/g, " - ").replace(/^[\s-]+|[\s-]+$/g, "");
}
/** The author folder Paperpile files an author's papers under: the surname in capitals ("HINTON"). */
const authorFolder = (author) => clean(surname(author)).toUpperCase();

//#endregion
//#region src/core/folders.ts
/**
* Folders implied by Paperpile's Drive paths. Paperpile files new PDFs under an
* author folder ("All Papers/HINTON/...", or "Other" without authors); older
* libraries filed them by the user's own folders ("All Papers/MLDS/Physics/...").
* A lone directory is an author folder when it is "Other" or one of the paper's
* authors' surnames in capitals, so the user's own "ML" or "2019" stays a folder.
* Without authors to compare, any lone directory in capitals with a letter is
* taken for one.
*/
function foldersFromPaperpile(file, authors = []) {
	const names = new Set(authors.map(authorFolder).filter(Boolean));
	const isAuthorFolder = (d) => d === "Other" || (names.size ? names.has(d) : d === d.toUpperCase() && d !== d.toLowerCase());
	const out = /* @__PURE__ */ new Set();
	for (const path of (file ?? "").split(";").map((s) => s.trim()).filter(Boolean)) {
		const dirs = path.split("/").slice(0, -1);
		if (dirs[0] === "All Papers") dirs.shift();
		if (!dirs.length) continue;
		if (dirs.length === 1 && isAuthorFolder(dirs[0])) continue;
		out.add(dirs.join("/"));
	}
	return [...out];
}

//#endregion
//#region src/core/merge.ts
/** JSON with sorted keys, so equal values compare equal whatever order their fields were set in. */
function canonical(v) {
	if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
	if (v && typeof v === "object") return `{${Object.keys(v).filter((k) => v[k] !== void 0).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
	return JSON.stringify(v) ?? "null";
}
const same = (a, b) => canonical(a) === canonical(b);
const SETS = /* @__PURE__ */ new Set(["tags", "folders"]);
/** Lists kept as sets: what either side added is in, what either side removed is out. */
function mergeSet(base = [], ours = [], theirs = []) {
	const removed = /* @__PURE__ */ new Set([...base.filter((x) => !ours.includes(x)), ...base.filter((x) => !theirs.includes(x))]);
	return [.../* @__PURE__ */ new Set([...ours, ...theirs])].filter((x) => !removed.has(x));
}
function mergePaper(base, ours, theirs) {
	const out = {};
	const b = base;
	const o = ours;
	const t = theirs;
	for (const k of /* @__PURE__ */ new Set([
		...Object.keys(o),
		...Object.keys(t),
		...Object.keys(b)
	])) {
		let v;
		if (SETS.has(k) && (Array.isArray(o[k]) || Array.isArray(t[k]))) v = mergeSet(b[k], o[k], t[k]);
		else v = same(o[k], b[k]) ? t[k] : o[k];
		if (v !== void 0) out[k] = v;
	}
	return out;
}
/**
* Three-way merge of library files. `base` is the version this device last
* read or wrote (null when it had none), `ours` what it holds now, `theirs`
* what is in storage now.
*/
function mergeLibraries(base, ours, theirs) {
	const baseById = new Map((base?.papers ?? []).map((p) => [p.id, p]));
	const oursById = new Map(ours.papers.map((p) => [p.id, p]));
	const theirsById = new Map(theirs.papers.map((p) => [p.id, p]));
	const papers = [];
	let fromThem = 0;
	const pick = (id) => {
		const b = baseById.get(id);
		const o = oursById.get(id);
		const t = theirsById.get(id);
		if (!b) return o ?? t ?? null;
		if (!o) return t && !same(t, b) ? t : null;
		if (!t) return same(o, b) ? null : o;
		if (same(o, b)) return t;
		if (same(t, b)) return o;
		return mergePaper(b, o, t);
	};
	for (const id of /* @__PURE__ */ new Set([...theirsById.keys(), ...oursById.keys()])) {
		const p = pick(id);
		if (p) papers.push(p);
		if (!same(p, oursById.get(id) ?? null)) fromThem++;
	}
	const bibSync = same(ours.bibSync ?? [], base?.bibSync ?? []) ? theirs.bibSync : ours.bibSync;
	return {
		file: {
			format: "lightkone-library",
			version: 1,
			papers,
			...bibSync?.length ? { bibSync } : {}
		},
		fromThem
	};
}

//#endregion
//#region src/core/library.ts
const LIBRARY_PATH = "lightkone/library.json";
const BIB_PATH = "lightkone/library.bib";
const decoder = new TextDecoder();
const normDoi = (d) => d?.trim().toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, "") || void 0;
const normArxiv = (a) => a?.trim().toLowerCase().replace(/^arxiv:/, "").replace(/v\d+$/, "") || void 0;
const normTitle = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "");
function newId() {
	return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
/** Paperpile-style citation key: Lastname + year + two letters from the title. */
function makeKey(d, taken) {
	const last = (d.authors?.[0] ?? "Anon").split(",")[0].normalize("NFKD").replace(/[^A-Za-z]/g, "") || "Anon";
	const words = d.title.toLowerCase().replace(/[^a-z ]/g, "").split(" ").filter((w) => w.length > 3);
	const base = `${last[0].toUpperCase()}${last.slice(1)}${d.year ?? ""}`;
	let suffix = ((words[0] ?? "xx").slice(0, 1) + (words[1] ?? words[0] ?? "xx").slice(0, 1)).padEnd(2, "x");
	let key = `${base}-${suffix}`;
	for (let i = 2; taken.has(key); i++) key = `${base}-${suffix}${i}`;
	return key;
}
const parseFile = (raw) => {
	const file = JSON.parse(raw);
	if (file.format !== "lightkone-library") throw new Error("lightkone/library.json is not a Lightkone library.");
	return file;
};
/** Top-level keys of library.json that lightkone does not use; other tools' data, kept as found. */
const otherKeys = (file) => {
	const { format, version, papers, bibSync, ...rest } = file;
	return rest;
};
var Library = class {
	storage;
	papers = [];
	bibSync = [];
	other = {};
	listeners = /* @__PURE__ */ new Set();
	/** library.json as this device last read or wrote it: what a merge starts from. */
	base = null;
	/** Saves and refreshes run one at a time. */
	queue = Promise.resolve();
	constructor(storage = null) {
		this.storage = storage;
	}
	onChange(fn) {
		this.listeners.add(fn);
		return () => this.listeners.delete(fn);
	}
	emit() {
		this.listeners.forEach((fn) => fn());
	}
	async load() {
		this.papers = [];
		this.bibSync = [];
		this.other = {};
		this.base = null;
		if (!this.storage) return {
			loaded: 0,
			seeded: 0,
			foldered: 0
		};
		const raw = await this.storage.read(LIBRARY_PATH);
		if (raw) {
			this.base = decoder.decode(raw);
			const file = parseFile(this.base);
			this.papers = file.papers;
			this.bibSync = file.bibSync ?? [];
			this.other = otherKeys(file);
		}
		const loaded = this.papers.length;
		let seeded = 0;
		if (this.storage.seed) seeded = this.merge(await this.storage.seed()).added.length;
		let foldered = 0;
		for (const p of this.papers) {
			if (p.folders) continue;
			p.folders = foldersFromPaperpile(p.file, p.authors);
			if (p.folders.length) foldered++;
		}
		this.emit();
		return {
			loaded,
			seeded,
			foldered
		};
	}
	file() {
		return {
			format: "lightkone-library",
			version: 1,
			papers: this.papers,
			...this.bibSync.length ? { bibSync: this.bibSync } : {},
			...this.other
		};
	}
	/**
	* Take in what was saved elsewhere since this device last read or wrote,
	* keeping this device's own changes. Returns how many papers changed.
	*/
	async catchUp() {
		const raw = await this.storage.read(LIBRARY_PATH);
		const now = raw && decoder.decode(raw);
		if (!now || now === this.base) return 0;
		const theirs = parseFile(now);
		const { file, fromThem } = mergeLibraries(this.base ? parseFile(this.base) : null, this.file(), theirs);
		this.papers = file.papers;
		this.bibSync = file.bibSync ?? [];
		this.other = otherKeys(theirs);
		this.base = now;
		if (fromThem) this.emit();
		return fromThem;
	}
	serial(fn) {
		const run = this.queue.then(fn, fn);
		this.queue = run.catch(() => {});
		return run;
	}
	/** Save, first merging in changes saved elsewhere. Returns how many papers took such changes. */
	save() {
		return this.serial(async () => {
			if (!this.storage) return 0;
			const merged = await this.catchUp();
			const text = JSON.stringify(this.file(), null, 1);
			if (text === this.base) return merged;
			await this.storage.write(LIBRARY_PATH, text, "application/json");
			this.base = text;
			await this.storage.write(BIB_PATH, libraryToBibtex(this.papers.filter((p) => !p.trashed)), "application/x-bibtex");
			return merged;
		});
	}
	/** Pick up changes saved elsewhere without writing. Returns how many papers changed. */
	refresh() {
		return this.serial(async () => this.storage ? this.catchUp() : 0);
	}
	findDuplicate(d) {
		const doi = normDoi(d.doi);
		const arxiv = normArxiv(d.arxiv);
		const title = normTitle(d.title);
		return this.papers.find((p) => doi && normDoi(p.doi) === doi || arxiv && normArxiv(p.arxiv) === arxiv || d.key && p.key === d.key || title.length > 20 && normTitle(p.title) === title);
	}
	/** Adds drafts that are not already in the library. Existing papers gain missing fields and tags. */
	merge(drafts) {
		const added = [];
		const updated = [];
		const keys = new Set(this.papers.map((p) => p.key));
		for (const d of drafts) {
			if (!d.title?.trim()) continue;
			const existing = this.findDuplicate(d);
			if (existing) {
				let changed = false;
				for (const k of [
					"abstract",
					"doi",
					"arxiv",
					"url",
					"venue",
					"year",
					"file"
				]) if (!existing[k] && d[k]) {
					existing[k] = d[k];
					changed = true;
				}
				const tags = [.../* @__PURE__ */ new Set([...existing.tags, ...d.tags ?? []])];
				if (tags.length !== existing.tags.length) {
					existing.tags = tags;
					changed = true;
				}
				const folders = [.../* @__PURE__ */ new Set([...existing.folders ?? [], ...d.folders ?? foldersFromPaperpile(d.file, d.authors)])];
				if (folders.length !== (existing.folders ?? []).length) {
					existing.folders = folders;
					changed = true;
				}
				if (changed) updated.push(existing);
				continue;
			}
			const key = d.key && !keys.has(d.key) ? d.key : makeKey(d, keys);
			keys.add(key);
			const paper = {
				type: "article",
				authors: [],
				fields: {},
				...d,
				tags: d.tags ?? [],
				folders: d.folders ?? foldersFromPaperpile(d.file, d.authors),
				id: newId(),
				key,
				added: d.added ?? (/* @__PURE__ */ new Date()).toISOString()
			};
			this.papers.push(paper);
			added.push(paper);
		}
		if (added.length || updated.length) this.emit();
		return {
			added,
			updated
		};
	}
	update(id, patch) {
		const p = this.papers.find((x) => x.id === id);
		if (!p) return;
		Object.assign(p, patch, { id: p.id });
		this.emit();
	}
	remove(id) {
		this.papers = this.papers.filter((p) => p.id !== id);
		this.emit();
	}
	tagCounts() {
		const counts = /* @__PURE__ */ new Map();
		for (const p of this.papers) for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
		return [...counts].sort((a, b) => a[0].localeCompare(b[0], void 0, { sensitivity: "base" }));
	}
};

//#endregion
//#region ../symbolon/packs/kausalflow/lightkone/oracle/adapters/serve.ts
/** Thrown by an adapter when the contract says the input is invalid. */
var ValueError = class extends Error {};
/** JSON null means "absent"; lightkone's types use undefined for that. */
const dropNulls = (v) => {
	if (Array.isArray(v)) return v.map(dropNulls);
	if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).filter(([, x]) => x !== null).map(([k, x]) => [k, dropNulls(x)]));
	return v;
};
async function serve(run) {
	for await (const line of createInterface({ input: process.stdin })) {
		let reply;
		try {
			reply = { output: await run(dropNulls(JSON.parse(line))) };
		} catch (e) {
			const err = e;
			reply = { error: {
				type: err instanceof ValueError ? "ValueError" : err.name || "Error",
				message: err.message
			} };
		}
		process.stdout.write(JSON.stringify(reply) + "\n");
	}
}

//#endregion
//#region ../symbolon/packs/kausalflow/lightkone/oracle/adapters/library-file.ts
serve(async ({ text }) => {
	const files = /* @__PURE__ */ new Map([[LIBRARY_PATH, text]]);
	const written = /* @__PURE__ */ new Set();
	const lib = new Library({
		read: async (path) => files.has(path) ? new TextEncoder().encode(files.get(path)) : null,
		write: async (path, data) => {
			files.set(path, data);
			written.add(path);
		}
	});
	let foldered;
	try {
		({foldered} = await lib.load());
	} catch (e) {
		throw new ValueError(e.message);
	}
	await lib.save();
	return {
		written: written.has(LIBRARY_PATH),
		library: files.get(LIBRARY_PATH),
		bib: files.get("lightkone/library.bib") ?? null,
		foldered
	};
});

//#endregion
export {  };