import { createInterface } from "node:readline";

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
//#region ../symbolon/packs/kausalflow/lightkone/oracle/adapters/library-merge.ts
serve(({ base, ours, theirs }) => mergeLibraries(base ?? null, ours, theirs));

//#endregion
export {  };