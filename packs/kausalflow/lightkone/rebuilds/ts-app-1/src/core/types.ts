// A paper as lightkone stores it in lightkone/library.json. The components
// read the fields they need; the rest belongs to the app (PRODUCT.md,
// Surfaces). Any key another tool wrote is kept as is.
export interface Paper {
  id: string;
  key: string;
  type: string;
  title: string;
  authors: string[];
  year?: number;
  venue?: string;
  abstract?: string;
  doi?: string;
  arxiv?: string;
  url?: string;
  tags: string[];
  file?: string;
  added: string;
  folders?: string[];
  fields: Record<string, string>;
  // App fields.
  pdf?: string;
  notes?: string;
  starred?: boolean;
  trashed?: string;
  opened?: string;
  html?: string;
  markdown?: string;
  [other: string]: unknown;
}

/** A bibSync target (flow 11): a folder's .bib kept in a GitHub repository. */
export interface BibSyncTarget {
  folder: string;
  repo: string;
  path: string;
  branch?: string;
  [other: string]: unknown;
}

/** The top level of library.json. */
export interface Library {
  format: "lightkone-library";
  version: 1;
  papers: Paper[];
  bibSync?: BibSyncTarget[];
  [other: string]: unknown;
}

/** A paper before the library gives it an id, key and added time. */
export interface Draft {
  key?: string | null;
  type?: string;
  title: string;
  authors?: string[];
  year?: number | null;
  venue?: string | null;
  abstract?: string | null;
  doi?: string | null;
  arxiv?: string | null;
  url?: string | null;
  tags?: string[];
  file?: string | null;
  notes?: string | null;
  folders?: string[];
  fields?: Record<string, string>;
  /** Where a free PDF can be fetched, when a lookup found one. */
  pdfUrl?: string;
  /** For a saved web page: its raw HTML and main text as Markdown. */
  pageHtml?: string;
  pageMarkdown?: string;
}

export const LIBRARY_JSON = "lightkone/library.json";
export const LIBRARY_BIB = "lightkone/library.bib";
export const annotationsPath = (id: string) => `lightkone/annotations/${id}.json`;
export const textPath = (id: string) => `lightkone/text/${id}.txt`;
export const pagePath = (id: string, ext: "html" | "md") => `lightkone/pages/${id}.${ext}`;

export function isTrashed(p: { trashed?: unknown }): boolean {
  return Boolean(p.trashed);
}
