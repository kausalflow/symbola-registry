// lightkone/bibtex-export@1: a paper as the exact BibTeX entry lightkone writes.
// Pure module: no Node or DOM APIs.

/** The fields of a paper the BibTeX writer reads (the contract's Paper). */
export interface Paper {
  key: string;
  type: string;
  title: string;
  authors?: string[];
  year?: number | null;
  venue?: string | null;
  doi?: string | null;
  arxiv?: string | null;
  url?: string | null;
  abstract?: string | null;
  tags?: string[];
  file?: string | null;
  fields?: Record<string, string>;
  /** A stored app paper carries more keys (id, notes, pdf, ...); they are ignored. */
  [extra: string]: unknown;
}

const present = (v: unknown): v is string | number => v !== undefined && v !== null && v !== "";

/** Escapes & % # in title, venue and abstract, unless a backslash already precedes them. */
export function escapeSpecial(s: string): string {
  return s.replace(/\\?([&%#])/g, "\\$1");
}

function author(a: string): string {
  return a.includes(",") || a === "others" ? a : "{" + a + "}";
}

/** The BibTeX entry for one paper, ending with a newline. */
export function exportBibtex(paper: Paper): string {
  const type = paper.type || "misc";
  const fields = paper.fields ?? {};
  const authors = paper.authors ?? [];
  const tags = paper.tags ?? [];
  const venueField = type === "inproceedings" || type === "incollection" ? "booktitle" : "journal";

  const out: [string, string][] = [];
  out.push(["title", "{" + escapeSpecial(String(paper.title ?? "")) + "}"]);
  if (authors.length) out.push(["author", authors.map(author).join(" and ")]);
  if (paper.year !== undefined && paper.year !== null) out.push(["year", String(paper.year)]);
  if (present(paper.venue) && !fields[venueField]) out.push([venueField, escapeSpecial(String(paper.venue))]);
  if (present(paper.doi)) out.push(["doi", String(paper.doi)]);
  if (present(paper.arxiv)) {
    out.push(["eprint", String(paper.arxiv)]);
    out.push(["archiveprefix", "arXiv"]);
  }
  if (present(paper.url)) out.push(["url", String(paper.url)]);
  if (present(paper.abstract)) out.push(["abstract", escapeSpecial(String(paper.abstract))]);
  const keywords = tags.join(";");
  if (keywords) out.push(["keywords", keywords]);
  if (present(paper.file)) out.push(["file", String(paper.file)]);
  for (const [name, value] of Object.entries(fields)) {
    if (value && !name.startsWith("lightkone-")) out.push([name, String(value)]);
  }

  const width = Math.max(...out.map(([n]) => n.length));
  const lines = out.map(([n, v]) => "  " + n.padEnd(width) + " = {" + v + "}");
  return "@" + type + "{" + (paper.key ?? "") + ",\n" + lines.join(",\n") + "\n}\n";
}

export function run(input: { paper: Paper }): { text: string } {
  return { text: exportBibtex(input.paper) };
}
