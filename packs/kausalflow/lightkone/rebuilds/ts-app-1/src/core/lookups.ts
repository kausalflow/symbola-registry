// Identifier lookups (flow 3): arXiv, Crossref, Semantic Scholar, OpenAlex,
// publisher pages, and Unpaywall for free PDFs. Each turns what the owner
// pasted into paper drafts. Plugins add more through the same interface.
import { htmlToMarkdown, metaTags, pageTitle, stripTags, decodeEntities } from "./html.ts";
import type { Net } from "./net.ts";
import type { Draft } from "./types.ts";

export interface LookupContext {
  net: Net;
  /** Contact email for Unpaywall and Crossref's polite pool. */
  email?: string;
}

export interface Lookup {
  id: string;
  label: string;
  /** Whether this lookup understands the pasted line. */
  match(line: string): boolean;
  resolve(line: string, ctx: LookupContext): Promise<Draft[]>;
}

// ── Identifiers ──────────────────────────────────────────────────────────

const ARXIV_NEW = /^\d{4}\.\d{4,5}(v\d+)?$/;
const ARXIV_OLD = /^[a-z-]+(\.[A-Z]{2})?\/\d{7}(v\d+)?$/;

/** An arXiv id from an id, "arXiv:..." or an arxiv.org link, without version. */
export function arxivId(s: string): string | null {
  let t = s.trim();
  const url = /arxiv\.org\/(?:abs|pdf|html)\/([^?#\s]+?)(?:\.pdf)?(?:[?#]|$)/i.exec(t);
  if (url) t = url[1];
  t = t.replace(/^arxiv:\s*/i, "");
  if (ARXIV_NEW.test(t) || ARXIV_OLD.test(t)) return t.replace(/v\d+$/, "");
  return null;
}

/** A DOI from a bare DOI, "doi:..." or a doi.org link. */
export function doiOf(s: string): string | null {
  let t = s.trim().replace(/^doi:\s*/i, "");
  const url = /^https?:\/\/(?:dx\.)?doi\.org\/(.+)$/i.exec(t);
  if (url) t = decodeURIComponent(url[1]);
  return /^10\.\d{4,9}\/\S+$/.test(t) ? t : null;
}

/** DOI or arXiv id somewhere in a text, e.g. a PDF's first page. */
export function findIdentifiers(text: string): { doi?: string; arxiv?: string } {
  const out: { doi?: string; arxiv?: string } = {};
  const doi = /\b(10\.\d{4,9}\/[^\s"<>]+)/.exec(text);
  if (doi) out.doi = doi[1].replace(/[.,;)\]]+$/, "");
  const ax = /arXiv:\s*(\d{4}\.\d{4,5})(v\d+)?/i.exec(text) ?? /arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5})/i.exec(text);
  if (ax) out.arxiv = ax[1];
  return out;
}

// ── arXiv ────────────────────────────────────────────────────────────────

function xmlText(xml: string, tag: string): string | undefined {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(xml);
  return m ? decodeEntities(m[1]).replace(/\s+/g, " ").trim() : undefined;
}

/** "Geoffrey E. Hinton" -> "Hinton, Geoffrey E." */
export function flipName(name: string): string {
  const n = name.replace(/\s+/g, " ").trim();
  if (!n || n.includes(",")) return n;
  const parts = n.split(" ");
  if (parts.length < 2) return n;
  const last = parts.pop()!;
  return `${last}, ${parts.join(" ")}`;
}

export async function arxivDraft(id: string, ctx: LookupContext): Promise<Draft | null> {
  const res = await ctx.net.passThrough(`https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`arXiv answered ${res.status}`);
  const xml = await res.text();
  const entry = /<entry>([\s\S]*?)<\/entry>/.exec(xml)?.[1];
  if (!entry) return null;
  const title = xmlText(entry, "title");
  if (!title || /^Error$/i.test(title)) return null;
  const authors = [...entry.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>/g)].map((m) => flipName(decodeEntities(m[1])));
  const published = xmlText(entry, "published");
  const doi = xmlText(entry, "arxiv:doi");
  const journal = xmlText(entry, "arxiv:journal_ref");
  const draft: Draft = {
    type: "article",
    title,
    authors,
    year: published ? Number(published.slice(0, 4)) : null,
    abstract: xmlText(entry, "summary") ?? null,
    arxiv: id,
    url: `https://arxiv.org/abs/${id}`,
    pdfUrl: `https://arxiv.org/pdf/${id}`,
    tags: [],
  };
  if (doi) draft.doi = doi;
  if (journal) draft.venue = journal;
  return draft;
}

// ── Crossref, OpenAlex, Semantic Scholar ─────────────────────────────────

const CROSSREF_TYPES: Record<string, string> = {
  "journal-article": "article",
  "proceedings-article": "inproceedings",
  "book-chapter": "incollection",
  book: "book",
  monograph: "book",
  "edited-book": "book",
  dissertation: "phdthesis",
  report: "techreport",
  "posted-content": "misc",
  dataset: "misc",
};

type CrossrefWork = {
  title?: string[];
  author?: { family?: string; given?: string; name?: string }[];
  editor?: { family?: string; given?: string; name?: string }[];
  issued?: { "date-parts"?: number[][] };
  published?: { "date-parts"?: number[][] };
  "container-title"?: string[];
  publisher?: string;
  type?: string;
  DOI?: string;
  URL?: string;
  abstract?: string;
  volume?: string;
  issue?: string;
  page?: string;
};

function crossrefDraft(w: CrossrefWork): Draft | null {
  const title = stripTags(w.title?.[0] ?? "");
  if (!title) return null;
  const people = w.author ?? w.editor ?? [];
  const authors = people
    .map((a) => (a.family ? (a.given ? `${a.family}, ${a.given}` : a.family) : (a.name ?? "")))
    .filter(Boolean);
  const year = (w.issued ?? w.published)?.["date-parts"]?.[0]?.[0];
  const type = CROSSREF_TYPES[w.type ?? ""] ?? "misc";
  const fields: Record<string, string> = {};
  if (w.volume) fields.volume = w.volume;
  if (w.issue) fields.number = w.issue;
  if (w.page) fields.pages = w.page.replace(/-/g, "--");
  if (w.publisher && type !== "article") fields.publisher = w.publisher;
  const draft: Draft = {
    type,
    title,
    authors,
    year: typeof year === "number" ? year : null,
    venue: stripTags(w["container-title"]?.[0] ?? "") || null,
    doi: w.DOI ?? null,
    url: w.URL ?? (w.DOI ? `https://doi.org/${w.DOI}` : null),
    abstract: w.abstract ? stripTags(w.abstract.replace(/<jats:title>[\s\S]*?<\/jats:title>/g, "")) : null,
    tags: [],
    fields,
  };
  return draft;
}

export async function crossrefByDoi(doi: string, ctx: LookupContext): Promise<Draft | null> {
  const mail = ctx.email ? `?mailto=${encodeURIComponent(ctx.email)}` : "";
  const res = await ctx.net.direct(`https://api.crossref.org/works/${encodeURIComponent(doi)}${mail}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Crossref answered ${res.status}`);
  const body = (await res.json()) as { message: CrossrefWork };
  return crossrefDraft(body.message);
}

export async function crossrefSearch(text: string, ctx: LookupContext): Promise<Draft | null> {
  const mail = ctx.email ? `&mailto=${encodeURIComponent(ctx.email)}` : "";
  const res = await ctx.net.direct(`https://api.crossref.org/works?rows=1&query.bibliographic=${encodeURIComponent(text)}${mail}`);
  if (!res.ok) return null;
  const body = (await res.json()) as { message: { items: (CrossrefWork & { score?: number })[] } };
  const top = body.message.items?.[0];
  if (!top) return null;
  // Only take a match whose title is really what was typed.
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const t = norm(stripTags(top.title?.[0] ?? ""));
  const q = norm(text);
  if (!t || !(q.includes(t) || t.includes(q))) return null;
  return crossrefDraft(top);
}

type OpenAlexWork = {
  title?: string;
  display_name?: string;
  publication_year?: number;
  doi?: string;
  type?: string;
  authorships?: { author: { display_name: string } }[];
  primary_location?: { source?: { display_name?: string } };
  abstract_inverted_index?: Record<string, number[]>;
  best_oa_location?: { pdf_url?: string };
  ids?: { doi?: string };
};

function openAlexAbstract(index?: Record<string, number[]>): string | null {
  if (!index) return null;
  const words: string[] = [];
  for (const [w, at] of Object.entries(index)) for (const i of at) words[i] = w;
  return words.filter(Boolean).join(" ") || null;
}

export async function openAlexByDoi(doi: string, ctx: LookupContext): Promise<Draft | null> {
  const mail = ctx.email ? `?mailto=${encodeURIComponent(ctx.email)}` : "";
  const res = await ctx.net.direct(`https://api.openalex.org/works/doi:${encodeURIComponent(doi)}${mail}`);
  if (!res.ok) return null;
  const w = (await res.json()) as OpenAlexWork;
  const title = w.title ?? w.display_name;
  if (!title) return null;
  return {
    type: w.type === "proceedings-article" ? "inproceedings" : w.type === "book-chapter" ? "incollection" : "article",
    title: stripTags(title),
    authors: (w.authorships ?? []).map((a) => flipName(a.author.display_name)),
    year: w.publication_year ?? null,
    venue: w.primary_location?.source?.display_name ?? null,
    doi,
    url: `https://doi.org/${doi}`,
    abstract: openAlexAbstract(w.abstract_inverted_index),
    pdfUrl: w.best_oa_location?.pdf_url,
    tags: [],
  };
}

type S2Paper = {
  title?: string;
  year?: number;
  venue?: string;
  abstract?: string;
  authors?: { name: string }[];
  externalIds?: { DOI?: string; ArXiv?: string };
  journal?: { name?: string; volume?: string; pages?: string };
  openAccessPdf?: { url?: string };
};

const S2_FIELDS = "title,year,venue,abstract,authors,externalIds,journal,openAccessPdf";

export async function semanticScholar(id: string, ctx: LookupContext): Promise<S2Paper | null> {
  const res = await ctx.net.direct(`https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(id)}?fields=${S2_FIELDS}`);
  if (!res.ok) return null;
  return (await res.json()) as S2Paper;
}

function s2Draft(p: S2Paper): Draft | null {
  if (!p.title) return null;
  return {
    type: "article",
    title: p.title,
    authors: (p.authors ?? []).map((a) => flipName(a.name)),
    year: p.year ?? null,
    venue: p.journal?.name || p.venue || null,
    doi: p.externalIds?.DOI ?? null,
    arxiv: p.externalIds?.ArXiv ?? null,
    abstract: p.abstract ?? null,
    pdfUrl: p.openAccessPdf?.url,
    tags: [],
  };
}

/** A DOI's paper from Crossref, else OpenAlex, else Semantic Scholar. */
export async function doiDraft(doi: string, ctx: LookupContext): Promise<Draft | null> {
  const tries: (() => Promise<Draft | null>)[] = [
    () => crossrefByDoi(doi, ctx),
    () => openAlexByDoi(doi, ctx),
    async () => {
      const p = await semanticScholar(`DOI:${doi}`, ctx);
      return p ? s2Draft(p) : null;
    },
  ];
  let lastError: unknown;
  for (const t of tries) {
    try {
      const d = await t();
      if (d) {
        // Fill a missing abstract from OpenAlex, which has more of them.
        if (!d.abstract) {
          const oa = await openAlexByDoi(doi, ctx).catch(() => null);
          if (oa?.abstract) d.abstract = oa.abstract;
          if (!d.pdfUrl && oa?.pdfUrl) d.pdfUrl = oa.pdfUrl;
        }
        return d;
      }
    } catch (e) {
      lastError = e;
    }
  }
  if (lastError) throw lastError;
  return null;
}

/** Published version of an arXiv preprint (flow 9), from Semantic Scholar. */
export async function publishedVersion(arxiv: string, ctx: LookupContext): Promise<Draft | null> {
  const p = await semanticScholar(`ARXIV:${arxiv}`, ctx);
  const doi = p?.externalIds?.DOI;
  if (!doi || doi.toLowerCase().startsWith("10.48550/")) return null;
  const d = await doiDraft(doi, ctx).catch(() => null);
  if (!d) return null;
  if (p?.journal?.volume && !d.fields?.volume) d.fields = { ...d.fields, volume: p.journal.volume };
  if (p?.journal?.pages && !d.fields?.pages) d.fields = { ...d.fields, pages: p.journal.pages.trim().replace(/\s*-+\s*/g, "--") };
  return d;
}

/** Unpaywall's best open-access PDF for a DOI; needs a contact email. */
export async function unpaywallPdf(doi: string, ctx: LookupContext): Promise<string | null> {
  if (!ctx.email) return null;
  const res = await ctx.net.direct(`https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(ctx.email)}`);
  if (!res.ok) return null;
  const body = (await res.json()) as { best_oa_location?: { url_for_pdf?: string }; oa_locations?: { url_for_pdf?: string }[] };
  return body.best_oa_location?.url_for_pdf ?? body.oa_locations?.find((l) => l.url_for_pdf)?.url_for_pdf ?? null;
}

// ── Web pages ────────────────────────────────────────────────────────────

/** A publisher page with citation_* tags is a paper; any other page is saved as a page. */
export async function pageDrafts(url: string, ctx: LookupContext): Promise<Draft[]> {
  const res = await ctx.net.passThrough(url);
  if (!res.ok) throw new Error(`The page answered ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  if (type.includes("pdf")) {
    return [{ type: "misc", title: decodeURIComponent(new URL(url).pathname.split("/").pop() || url).replace(/\.pdf$/i, ""), url, pdfUrl: url, tags: [] }];
  }
  const html = await res.text();
  const meta = metaTags(html);
  const first = (k: string) => meta.get(k)?.[0];
  const doi = doiOf(first("citation_doi") ?? first("dc.identifier") ?? first("prism.doi") ?? "");
  const arxiv = arxivId(first("citation_arxiv_id") ?? "");
  if (arxiv) {
    const d = await arxivDraft(arxiv, ctx);
    if (d) return [d];
  }
  if (doi) {
    const d = await doiDraft(doi, ctx).catch(() => null);
    if (d) {
      if (!d.pdfUrl && first("citation_pdf_url")) d.pdfUrl = first("citation_pdf_url");
      return [d];
    }
  }
  const title = first("citation_title");
  if (title) {
    const date = first("citation_publication_date") ?? first("citation_date") ?? first("citation_online_date") ?? "";
    return [
      {
        type: first("citation_conference_title") ? "inproceedings" : "article",
        title,
        authors: (meta.get("citation_author") ?? []).map(flipName),
        year: /\d{4}/.test(date) ? Number(/\d{4}/.exec(date)![0]) : null,
        venue: first("citation_journal_title") ?? first("citation_conference_title") ?? null,
        doi,
        url,
        abstract: first("citation_abstract") ?? first("description") ?? null,
        pdfUrl: first("citation_pdf_url"),
        tags: [],
      },
    ];
  }
  const published = first("article:published_time") ?? first("date") ?? "";
  return [
    {
      type: "misc",
      title: pageTitle(html) || url,
      authors: (meta.get("author") ?? meta.get("article:author") ?? []).filter((a) => !/^https?:/.test(a)).map(flipName),
      year: /^\d{4}/.test(published) ? Number(published.slice(0, 4)) : null,
      url,
      abstract: first("og:description") ?? first("description") ?? null,
      tags: [],
      pageHtml: html,
      pageMarkdown: htmlToMarkdown(html, url),
    },
  ];
}

// ── The built-in lookups, in the order they are tried ────────────────────

export const builtinLookups: Lookup[] = [
  {
    id: "arxiv",
    label: "arXiv",
    match: (l) => arxivId(l) !== null,
    resolve: async (l, ctx) => {
      const d = await arxivDraft(arxivId(l)!, ctx);
      return d ? [d] : [];
    },
  },
  {
    id: "doi",
    label: "DOI (Crossref, OpenAlex, Semantic Scholar)",
    match: (l) => doiOf(l) !== null,
    resolve: async (l, ctx) => {
      const d = await doiDraft(doiOf(l)!, ctx);
      return d ? [d] : [];
    },
  },
  {
    id: "web",
    label: "Publisher and web pages",
    match: (l) => /^https?:\/\//i.test(l.trim()),
    resolve: (l, ctx) => pageDrafts(l.trim(), ctx),
  },
  {
    id: "title",
    label: "Title (Crossref)",
    match: (l) => l.trim().split(/\s+/).length >= 4,
    resolve: async (l, ctx) => {
      const d = await crossrefSearch(l.trim(), ctx);
      return d ? [d] : [];
    },
  },
];
