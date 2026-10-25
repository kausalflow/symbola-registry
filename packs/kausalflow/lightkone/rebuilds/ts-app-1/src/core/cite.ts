// Cite (flow 10): a paper as \cite{key}, its BibTeX entry, Markdown, APA, or a
// journal style. BibTeX is bibtex-export's; the others are lightkone's own.
import { exportBibtex } from "../../impl/bibtex-export/src/index.ts";
import type { Paper } from "./types.ts";

export type CiteFormat = "latex" | "bibtex" | "markdown" | "apa" | "nature" | "ieee" | "chicago";

export const CITE_FORMATS: { id: CiteFormat; label: string }[] = [
  { id: "latex", label: "LaTeX \\cite" },
  { id: "bibtex", label: "BibTeX" },
  { id: "markdown", label: "Markdown" },
  { id: "apa", label: "APA 7" },
  { id: "nature", label: "Nature" },
  { id: "ieee", label: "IEEE" },
  { id: "chicago", label: "Chicago (author-date)" },
];

interface Name {
  family: string;
  given: string;
}

function split(a: string): Name {
  const i = a.indexOf(",");
  if (i < 0) return { family: a.replace(/^\{|\}$/g, "").trim(), given: "" };
  return { family: a.slice(0, i).trim(), given: a.slice(i + 1).trim() };
}

const initials = (given: string, sep = " ") =>
  given
    .split(/[\s]+/)
    .filter(Boolean)
    .map((g) => g.split("-").map((h) => (h[0] ? h[0].toUpperCase() + "." : "")).join("-"))
    .join(sep);

const link = (p: Paper) => (p.doi ? `https://doi.org/${p.doi}` : p.arxiv ? `https://arxiv.org/abs/${p.arxiv}` : (p.url ?? ""));
const end = (s: string) => (/[.?!]$/.test(s) ? s : s + ".");
const venueOf = (p: Paper) => p.venue || (p.arxiv ? `arXiv:${p.arxiv}` : "");

function listAuthors(names: Name[], fmt: (n: Name, i: number) => string, opts: { max: number; etal: string; last: string; sep?: string }) {
  if (!names.length) return "";
  if (names.length > opts.max) return fmt(names[0], 0) + opts.etal;
  const parts = names.map(fmt);
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(opts.sep ?? ", ") + opts.last + parts[parts.length - 1];
}

function volPages(p: Paper) {
  const vol = p.fields?.volume;
  const num = p.fields?.number;
  const pages = p.fields?.pages?.replace(/--/g, "–");
  return { vol, num, pages };
}

export function cite(p: Paper, format: CiteFormat): string {
  const names = p.authors.map(split);
  const year = p.year ? String(p.year) : "n.d.";
  const { vol, num, pages } = volPages(p);
  switch (format) {
    case "latex":
      return `\\cite{${p.key}}`;
    case "bibtex":
      return exportBibtex(p as never);
    case "markdown": {
      const who = listAuthors(names, (n) => n.family, { max: 2, etal: " et al.", last: " and " });
      const url = link(p);
      const title = url ? `[${p.title}](${url})` : p.title;
      return `${who ? who + " " : ""}(${year}). ${end(title)}${venueOf(p) ? ` *${venueOf(p)}*.` : ""}`;
    }
    case "apa": {
      const who = listAuthors(names, (n) => (n.given ? `${n.family}, ${initials(n.given)}` : n.family), {
        max: 20,
        etal: ", et al.",
        // APA 7: "Doe, J., & Roe, J." — the comma stays with two authors too.
        last: ", & ",
      });
      let s = `${who ? end(who) + " " : ""}(${year}). ${end(p.title)}`;
      const v = venueOf(p);
      if (v) s += ` *${v}*${vol ? `, *${vol}*` : ""}${num ? `(${num})` : ""}${pages ? `, ${pages}` : ""}.`;
      const url = link(p);
      return url ? `${s} ${url}` : s;
    }
    case "nature": {
      const who = listAuthors(names, (n) => (n.given ? `${n.family}, ${initials(n.given, " ")}` : n.family), {
        max: 5,
        etal: " et al.",
        last: " & ",
      });
      const v = venueOf(p);
      return `${who ? who + " " : ""}${end(p.title)}${v ? ` *${v}*` : ""}${vol ? ` **${vol}**` : ""}${pages ? `, ${pages}` : ""} (${year}).`;
    }
    case "ieee": {
      const who = listAuthors(names, (n) => (n.given ? `${initials(n.given)} ${n.family}` : n.family), {
        max: 6,
        etal: " et al.",
        last: names.length > 2 ? ", and " : " and ",
      });
      const v = venueOf(p);
      const bits = [v && `*${v}*`, vol && `vol. ${vol}`, num && `no. ${num}`, pages && `pp. ${pages}`, year].filter(Boolean);
      return `${who ? who + ", " : ""}“${p.title},” ${bits.join(", ")}${p.doi ? `, doi: ${p.doi}` : ""}.`;
    }
    case "chicago": {
      const who = listAuthors(
        names,
        (n, i) => (n.given ? (i === 0 ? `${n.family}, ${n.given}` : `${n.given} ${n.family}`) : n.family),
        { max: 10, etal: " et al.", last: names.length > 2 ? ", and " : " and " },
      );
      const v = venueOf(p);
      let s = `${who ? end(who) + " " : ""}${year}. “${end(p.title)}”`;
      if (v) s += ` *${v}*${vol ? ` ${vol}` : ""}${num ? ` (${num})` : ""}${pages ? `: ${pages}` : ""}.`;
      const url = link(p);
      return url ? `${s} ${url}.` : s;
    }
  }
}
