import { createInterface } from "node:readline";

//#region src/core/library.ts
const decoder = new TextDecoder();
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
//#region ../symbolon/packs/kausalflow/lightkone/oracle/adapters/citation-key.ts
serve(({ drafts, taken = [] }) => {
	const keys = new Set(taken);
	return { keys: drafts.map((d) => {
		const key = d.key && !keys.has(d.key) ? d.key : makeKey(d, keys);
		keys.add(key);
		return key;
	}) };
});

//#endregion
export {  };