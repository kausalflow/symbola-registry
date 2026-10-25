// lightkone/pdf-filing@1: where a paper's PDF goes, named as Paperpile names it.
// Pure module: no Node or DOM APIs.

export interface FilingPaper {
  id: string;
  title: string;
  authors?: string[];
  year?: number | null;
  [extra: string]: unknown;
}

/** A paper already in the library, as far as filing cares (extra keys allowed). */
export interface Filed {
  id: string;
  pdf?: string | null;
  file?: string | null;
  [extra: string]: unknown;
}

export interface FiledAt {
  pdf: string;
  file: string;
}

/** A string made safe for a file name, as Paperpile cleans it. */
export function clean(s: string): string {
  return s
    .replace(/---/g, "—")
    .replace(/--/g, "–")
    .replace(/[:/\\?*"<>|]/g, " - ")
    .replace(/\s+/g, " ")
    .replace(/( - )+/g, " - ")
    .replace(/^[ -]+|[ -]+$/g, "");
}

/** The part of an author before the first comma (all of it if none), trimmed. */
export function surname(a: string): string {
  const i = a.indexOf(",");
  return (i < 0 ? a : a.slice(0, i)).trim();
}

/** The author folder: the first author's cleaned surname in capitals, or "Other". */
export function folderFor(authors: readonly string[] | undefined): string {
  const first = authors?.[0];
  if (first === undefined || first === null) return "Other";
  return clean(surname(first)).toUpperCase() || "Other";
}

/** The file name without ".pdf". */
export function nameFor(paper: FilingPaper): string {
  const title = clean(String(paper.title ?? "")) || "Untitled";
  const names = (paper.authors ?? []).map(surname).filter((s) => s);
  let who = names.length === 0 ? title : names.length === 1 ? names[0] : names.length === 2 ? `${names[0]} and ${names[1]}` : `${names[0]} et al.`;
  if (who.length > 40) who = who.slice(0, 37) + "...";
  const hasYear = paper.year !== undefined && paper.year !== null && (paper.year as unknown) !== "";
  const head = hasYear ? clean(who + " " + paper.year) : clean(who);
  let name = head + " - " + title;
  if (name.length > 146) name = name.slice(0, 72).trimEnd() + " ... " + name.slice(-69).trimStart();
  return name;
}

/** Where a new PDF for paper goes, never on a name another paper uses. */
export function filePdf(paper: FilingPaper, library: readonly Filed[] = []): FiledAt {
  const taken = new Set<string>();
  for (const other of library) {
    if (other.id === paper.id) continue;
    if (other.pdf) taken.add(other.pdf);
    if (other.file) for (const part of other.file.split(";")) taken.add("papers/" + part.trim());
  }
  const base = `All Papers/${folderFor(paper.authors)}/${nameFor(paper)}`;
  let file = base + ".pdf";
  for (let n = 2; taken.has("papers/" + file); n++) file = `${base} (${n}).pdf`;
  return { pdf: "papers/" + file, file };
}

export function run(input: { paper: FilingPaper; library?: Filed[] }): FiledAt {
  return filePdf(input.paper, input.library ?? []);
}
