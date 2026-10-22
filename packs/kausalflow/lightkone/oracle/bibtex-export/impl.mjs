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
//#region ../symbolon/packs/kausalflow/lightkone/oracle/adapters/bibtex-export.ts
serve(({ paper }) => ({ text: paperToBibtex(paper) }));

//#endregion
export {  };