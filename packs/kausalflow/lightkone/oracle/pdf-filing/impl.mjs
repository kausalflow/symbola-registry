import { createInterface } from "node:readline";

//#region src/core/filing.ts
const PDF_DIR = "papers/";
const ALL_PAPERS = "All Papers";
const surname = (a) => (a.includes(",") ? a.split(",")[0] : a).trim();
/** Characters a file name cannot hold become " - ", as Paperpile does ("Title: Subtitle" → "Title - Subtitle"). */
function clean(s) {
	return s.replace(/---/g, "—").replace(/--/g, "–").replace(/[:/\\?*"<>|]/g, " - ").replace(/\s+/g, " ").replace(/( - )+/g, " - ").replace(/^[\s-]+|[\s-]+$/g, "");
}
function authorPart(authors, title) {
	const names = authors.map(surname).filter(Boolean);
	const s = names.length === 0 ? title : names.length === 1 ? names[0] : names.length === 2 ? `${names[0]} and ${names[1]}` : `${names[0]} et al.`;
	return s.length > 40 ? `${s.slice(0, 37)}...` : s;
}
/** Path under papers/, the same as Paperpile's BibTeX `file` field: as in its BibTeX `file` field: "All Papers/HINTON/Hinton et al. 2012 - ....pdf". */
function paperpileFile(p) {
	const first = p.authors[0] ? clean(surname(p.authors[0])).toUpperCase() : "";
	const title = clean(p.title) || "Untitled";
	let name = `${clean([authorPart(p.authors, title), p.year].filter(Boolean).join(" "))} - ${title}`;
	if (name.length > 146) name = `${name.slice(0, 72).trimEnd()} ... ${name.slice(-69).trimStart()}`;
	return `${ALL_PAPERS}/${first || "Other"}/${name}.pdf`;
}
/**
* Where a new PDF for this paper goes: its storage path and the matching
* Paperpile `file` value. A name another paper already uses gets " (2)", " (3)" ...
*/
function pdfLocation(p, library) {
	const taken = new Set(library.filter((q) => q.id !== p.id).flatMap((q) => [q.pdf, ...(q.file ?? "").split(";").map((f) => PDF_DIR + f.trim())]));
	const file = paperpileFile(p);
	let candidate = file;
	for (let i = 2; taken.has(PDF_DIR + candidate); i++) candidate = file.replace(/\.pdf$/, ` (${i}).pdf`);
	return {
		pdf: PDF_DIR + candidate,
		file: candidate
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
			reply = { output: run(dropNulls(JSON.parse(line))) };
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
//#region ../symbolon/packs/kausalflow/lightkone/oracle/adapters/pdf-filing.ts
serve(({ paper, library = [] }) => pdfLocation(paper, library));

//#endregion
export {  };