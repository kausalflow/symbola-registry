// lightkone/citation-key@1: Paperpile-style citation keys, unique in the library.

export interface Draft {
  title: string;
  authors?: string[];
  year?: number | null;
  key?: string | null;
}

function base(d: Draft): string {
  const authors = d.authors ?? [];
  const raw = authors.length ? String(authors[0]).split(",")[0] : "";
  let last = raw.normalize("NFKD").replace(/[^A-Za-z]/g, "");
  if (!last) last = "Anon";
  const year = d.year === null || d.year === undefined ? "" : String(d.year);
  return last[0].toUpperCase() + last.slice(1) + year;
}

function suffix(d: Draft): string {
  const words = String(d.title ?? "")
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .split(" ")
    .filter((w) => w.length > 3);
  if (!words.length) return "xx";
  return words[0][0] + (words.length > 1 ? words[1] : words[0])[0];
}

/** The key the draft would get with nothing taken (before any number). */
export function baseKey(d: Draft): string {
  return `${base(d)}-${suffix(d)}`;
}

/** One key per draft, in order; each key given is taken for later drafts. */
export function assignKeys(drafts: Draft[], taken: Iterable<string> = []): string[] {
  const used = new Set<string>(taken);
  const out: string[] = [];
  for (const d of drafts) {
    let key: string;
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

export function run(input: { drafts: Draft[]; taken?: string[] }): { keys: string[] } {
  return { keys: assignKeys(input.drafts ?? [], input.taken ?? []) };
}
