import { createInterface } from "node:readline";

//#region src/core/search.ts
const fold = (s) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
function parseQuery(input) {
	const q = {
		words: [],
		tags: [],
		authors: [],
		has: [],
		no: [],
		folders: [],
		is: []
	};
	for (const m of input.matchAll(/(\w+):"([^"]*)"|(\w+):(\S+)|"([^"]*)"|(\S+)/g)) {
		const field = (m[1] ?? m[3])?.toLowerCase();
		const value = m[2] ?? m[4];
		if (field === "tag") q.tags.push(fold(value));
		else if (field === "author") q.authors.push(fold(value));
		else if (field === "has") q.has.push(value.toLowerCase());
		else if (field === "no") q.no.push(value.toLowerCase());
		else if (field === "in") q.folders.push(fold(value).replace(/\/+$/, ""));
		else if (field === "is") q.is.push(value.toLowerCase());
		else if (field === "year") {
			const [a, b] = value.split("-").map(Number);
			if (a) q.years = [a, b || a];
		} else q.words.push(fold(m[5] ?? m[6] ?? m[0]));
	}
	return q;
}
const inFolder = (p, f) => (p.folders ?? []).some((pf) => {
	const x = fold(pf);
	return x === f || x.startsWith(`${f}/`);
});
function score(p, q, inText) {
	if (Boolean(p.trashed) !== q.is.includes("trash")) return 0;
	if (q.is.includes("starred") && !p.starred) return 0;
	if (q.is.includes("recent") && !p.opened) return 0;
	if (q.folders.length && !q.folders.every((f) => inFolder(p, f))) return 0;
	if (q.tags.length && !q.tags.every((t) => p.tags.some((pt) => fold(pt) === t))) return 0;
	const authorText = fold(p.authors.join(" ; "));
	if (q.authors.length && !q.authors.every((a) => authorText.includes(a))) return 0;
	if (q.years && (!p.year || p.year < q.years[0] || p.year > q.years[1])) return 0;
	for (const h of q.has) {
		if (h === "pdf" && !p.pdf && !p.file) return 0;
		if (h === "abstract" && !p.abstract) return 0;
		if (h === "arxiv" && !p.arxiv) return 0;
		if (h === "notes" && !p.notes) return 0;
	}
	for (const n of q.no) {
		if (n === "pdf" && p.pdf) return 0;
		if (n === "abstract" && p.abstract) return 0;
		if (n === "arxiv" && p.arxiv) return 0;
		if (n === "notes" && p.notes) return 0;
	}
	if (!q.words.length) return 1;
	const title = fold(p.title);
	const rest = fold([
		p.abstract,
		p.venue,
		p.tags.join(" "),
		p.key,
		p.doi,
		p.arxiv,
		p.notes
	].filter(Boolean).join(" "));
	let total = 0;
	for (const w of q.words) {
		const s = (title.includes(w) ? 5 : 0) + (authorText.includes(w) ? 4 : 0) + (rest.includes(w) ? 1 : 0);
		if (!s) return inText?.(p.id, q.words) ? .5 : 0;
		total += s;
	}
	return total;
}
function search(papers, input, sort = "added", inText) {
	const q = parseQuery(input);
	const scored = papers.map((p) => [p, score(p, q, inText)]).filter(([, s]) => s > 0);
	const by = {
		relevance: (a, b, sa, sb) => sb - sa || b.added.localeCompare(a.added),
		added: (a, b) => b.added.localeCompare(a.added),
		year: (a, b) => (b.year ?? 0) - (a.year ?? 0),
		title: (a, b) => a.title.localeCompare(b.title),
		opened: (a, b) => (b.opened ?? "").localeCompare(a.opened ?? "") || b.added.localeCompare(a.added)
	};
	const effective = sort === "added" && q.is.includes("recent") ? "opened" : sort === "added" && q.words.length ? "relevance" : sort;
	return scored.sort((x, y) => by[effective](x[0], y[0], x[1], y[1])).map(([p]) => p);
}

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
//#region ../symbolon/packs/kausalflow/lightkone/oracle/adapters/search-query.ts
serve(({ papers, query, sort }) => {
	const full = papers.map((p) => ({
		key: "",
		type: "misc",
		authors: [],
		tags: [],
		fields: {},
		...p
	}));
	return { ids: search(full, query, sort ?? "added").map((p) => p.id) };
});

//#endregion
export {  };