import { createInterface } from "node:readline";

//#region src/core/library.ts
const decoder = new TextDecoder();
const normDoi = (d) => d?.trim().toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, "") || void 0;
const normArxiv = (a) => a?.trim().toLowerCase().replace(/^arxiv:/, "").replace(/v\d+$/, "") || void 0;

//#endregion
//#region src/core/tidy.ts
const normTitle = (t) => t.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "");
const firstAuthor = (p) => (p.authors[0] ?? "").split(",")[0].normalize("NFKD").toLowerCase().replace(/[^a-z]/g, "");
/**
* Groups of papers that are probably the same: same DOI, same arXiv id, or the
* same title (short titles also need the same first author). Trash is ignored.
*/
function findDuplicates(papers) {
	const live = papers.filter((p) => !p.trashed);
	const parent = new Map(live.map((p) => [p.id, p.id]));
	const root = (id) => parent.get(id) === id ? id : root(parent.get(id));
	const join = (a, b) => parent.set(root(a), root(b));
	const seen = /* @__PURE__ */ new Map();
	for (const p of live) {
		const t = normTitle(p.title);
		const keys = [
			p.doi && `doi:${normDoi(p.doi)}`,
			p.arxiv && `arxiv:${normArxiv(p.arxiv)}`,
			t.length > 20 ? `title:${t}` : t.length > 3 && `title:${t}:${firstAuthor(p)}`
		].filter(Boolean);
		for (const k of keys) {
			const other = seen.get(k);
			if (other) join(p.id, other);
			else seen.set(k, p.id);
		}
	}
	const groups = /* @__PURE__ */ new Map();
	for (const p of live) {
		const r = root(p.id);
		groups.set(r, [...groups.get(r) ?? [], p]);
	}
	return [...groups.values()].filter((g) => g.length > 1);
}
/** Which one to keep: the one with a PDF, then with notes, then the oldest. */
function pickKeeper(group) {
	return [...group].sort((a, b) => Number(!!b.pdf) - Number(!!a.pdf) || Number(!!b.notes) - Number(!!a.notes) || a.added.localeCompare(b.added))[0];
}
/** The keeper with everything the others add: tags, folders, notes, star, missing fields and PDF. */
function mergeInto(keep, others) {
	const all = [keep, ...others];
	const patch = {
		tags: [...new Set(all.flatMap((p) => p.tags))],
		folders: [...new Set(all.flatMap((p) => p.folders ?? []))],
		notes: [...new Set(all.map((p) => p.notes?.trim()).filter(Boolean))].join("\n\n") || void 0,
		starred: all.some((p) => p.starred) || void 0,
		fields: Object.assign({}, ...[...others].reverse().map((p) => p.fields), keep.fields),
		added: all.map((p) => p.added).sort()[0]
	};
	for (const k of [
		"abstract",
		"doi",
		"arxiv",
		"url",
		"venue",
		"year",
		"pdf",
		"file",
		"opened"
	]) if (!keep[k]) {
		const v = others.find((p) => p[k])?.[k];
		if (v) patch[k] = v;
	}
	return patch;
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
//#region ../symbolon/packs/kausalflow/lightkone/oracle/adapters/tidy.ts
serve(({ papers }) => ({ groups: findDuplicates(papers).map((group) => {
	const keep = pickKeeper(group);
	return {
		ids: group.map((p) => p.id),
		keep: keep.id,
		patch: mergeInto(keep, group.filter((p) => p !== keep))
	};
}) }));

//#endregion
export {  };