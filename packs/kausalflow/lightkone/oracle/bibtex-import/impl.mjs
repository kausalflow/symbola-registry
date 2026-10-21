import { createInterface } from "node:readline";

//#region src/core/bibtex.ts
const MONTHS = {
	jan: "January",
	feb: "February",
	mar: "March",
	apr: "April",
	may: "May",
	jun: "June",
	jul: "July",
	aug: "August",
	sep: "September",
	oct: "October",
	nov: "November",
	dec: "December"
};
function parseBibtex(text) {
	const entries = [];
	const macros = { ...MONTHS };
	let i = 0;
	const n = text.length;
	const skipSpace = () => {
		while (i < n && /\s/.test(text[i])) i++;
	};
	const readWord = () => {
		const start = i;
		while (i < n && /[^\s,={}()"#]/.test(text[i])) i++;
		return text.slice(start, i);
	};
	const readBraced = () => {
		let depth = 0;
		const start = i + 1;
		for (; i < n; i++) {
			if (text[i] === "\\") {
				i++;
				continue;
			}
			if (text[i] === "{") depth++;
			else if (text[i] === "}" && --depth === 0) {
				i++;
				return text.slice(start, i - 1);
			}
		}
		return text.slice(start);
	};
	const readQuoted = () => {
		let depth = 0;
		const start = ++i;
		for (; i < n; i++) {
			const c = text[i];
			if (c === "\\") {
				i++;
				continue;
			}
			if (c === "{") depth++;
			else if (c === "}") depth--;
			else if (c === "\"" && depth === 0) {
				i++;
				return text.slice(start, i - 1);
			}
		}
		return text.slice(start);
	};
	const readValue = () => {
		const parts = [];
		for (;;) {
			skipSpace();
			const c = text[i];
			if (c === "{") parts.push(readBraced());
			else if (c === "\"") parts.push(readQuoted());
			else {
				const w = readWord();
				if (!w) break;
				parts.push(/^\d+$/.test(w) ? w : macros[w.toLowerCase()] ?? w);
			}
			skipSpace();
			if (text[i] === "#") {
				i++;
				continue;
			}
			break;
		}
		return parts.join("");
	};
	while (i < n) {
		const at = text.indexOf("@", i);
		if (at < 0) break;
		i = at + 1;
		const type = readWord().toLowerCase();
		skipSpace();
		const open = text[i];
		if (open !== "{" && open !== "(") continue;
		const close = open === "{" ? "}" : ")";
		i++;
		if (type === "comment") {
			i = at + 1;
			continue;
		}
		if (type === "preamble") {
			readValue();
			continue;
		}
		if (type === "string") {
			skipSpace();
			const name = readWord().toLowerCase();
			skipSpace();
			if (text[i] === "=") {
				i++;
				macros[name] = readValue();
			}
			continue;
		}
		skipSpace();
		const keyStart = i;
		while (i < n && text[i] !== "," && text[i] !== close) i++;
		const key = text.slice(keyStart, i).trim();
		const fields = {};
		while (i < n && text[i] !== close) {
			if (text[i] === ",") i++;
			skipSpace();
			if (text[i] === close) break;
			const name = readWord().toLowerCase();
			skipSpace();
			if (!name || text[i] !== "=") {
				while (i < n && text[i] !== "," && text[i] !== close) i++;
				continue;
			}
			i++;
			fields[name] = readValue().replace(/\s+/g, " ").trim();
			skipSpace();
		}
		i++;
		if (key || Object.keys(fields).length) entries.push({
			type,
			key,
			fields
		});
	}
	return entries;
}
/** Removes protective braces and the most common LaTeX escapes, for display and search. */
const ACCENTS = {
	"\"": "̈",
	"'": "́",
	"`": "̀",
	"^": "̂",
	"~": "̃",
	"=": "̄",
	".": "̇",
	c: "̧",
	v: "̌",
	u: "̆",
	H: "̋"
};
const LETTERS = {
	ss: "ß",
	o: "ø",
	O: "Ø",
	ae: "æ",
	AE: "Æ",
	l: "ł",
	L: "Ł",
	i: "ı"
};
function plain(value) {
	return value.replace(/\{?\\([\"'`^~=.]|[cvuH](?=[\s{]))\s*\{?([A-Za-z])\}?\}?/g, (_, a, ch) => (ch + ACCENTS[a]).normalize("NFC")).replace(/\{\\(ss|o|O|ae|AE|l|L|i)\}|\\(ss|o|O|ae|AE|l|L|i)\b ?/g, (_, a, b) => LETTERS[a ?? b]).replace(/\\(?:emph|textit|textbf|mathrm|textrm)\{([^{}]*)\}/g, "$1").replace(/\\([&%$#_{}])/g, "$1").replace(/(?<!\\)[{}]/g, "").replace(/~/g, " ").replace(/\s+/g, " ").trim();
}
const ARXIV_IN_URL = /arxiv\.org\/(?:abs|pdf|html)\/([^\s?#]+?)(?:v\d+)?(?:\.pdf)?(?:[?#]|$)/i;
function entryToDraft(entry) {
	const f = { ...entry.fields };
	const take = (name) => {
		const v = f[name];
		delete f[name];
		return v;
	};
	const title = plain(take("title") ?? "");
	const authors = splitAuthors(take("author") ?? take("editor") ?? "");
	const yearRaw = take("year");
	const year = yearRaw && /\d{4}/.test(yearRaw) ? Number(yearRaw.match(/\d{4}/)[0]) : void 0;
	const venue = plain(take("journal") ?? take("booktitle") ?? f.publisher ?? "") || void 0;
	const abstract = take("abstract");
	const doi = take("doi")?.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
	const url = take("url");
	const eprint = take("eprint");
	const arxivid = take("arxivid");
	const prefix = (f.archiveprefix ?? f.eprinttype ?? "").toLowerCase();
	let arxiv = arxivid || (prefix === "arxiv" ? eprint : void 0) || url?.match(ARXIV_IN_URL)?.[1];
	if (!arxiv && eprint && /^\d{4}\.\d{4,5}/.test(eprint)) arxiv = eprint;
	if (arxiv) {
		delete f.archiveprefix;
		delete f.eprinttype;
		delete f.primaryclass;
	} else if (eprint) f.eprint = eprint;
	const tags = (take("keywords") ?? "").split(/[;,]/).map((t) => plain(t)).filter((t) => t && !/^(doi|url|arxiv|isbn|issn|pmid|pmc):|https?:\/\//i.test(t));
	const file = take("file");
	const notes = take("annote") ?? take("note");
	return {
		key: entry.key,
		type: entry.type,
		title,
		authors,
		year,
		venue,
		abstract: abstract ? plain(abstract) : void 0,
		doi: doi || void 0,
		arxiv: arxiv?.replace(/^arxiv:/i, "").replace(/v\d+$/, "") || void 0,
		url,
		tags,
		file,
		notes,
		fields: f
	};
}
function splitAuthors(value) {
	if (!value.trim()) return [];
	return value.split(/\s+and\s+/i).map((raw) => [raw.trim(), plain(raw)]).filter(([, a]) => a).map(([raw, a]) => {
		if (a.includes(",") || a.toLowerCase() === "others" || /^\{.*\}$/s.test(raw)) return a;
		const parts = a.split(" ");
		return parts.length > 1 ? `${parts.pop()}, ${parts.join(" ")}` : a;
	});
}
const parseBibtexToDrafts = (text) => parseBibtex(text).filter((e) => e.fields.title).map(entryToDraft);

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
//#region ../symbolon/packs/kausalflow/lightkone/oracle/adapters/bibtex-import.ts
serve(({ text }) => ({ papers: parseBibtexToDrafts(text) }));

//#endregion
export {  };