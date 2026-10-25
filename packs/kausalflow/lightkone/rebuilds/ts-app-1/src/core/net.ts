// How the core reaches the outside. In the browser, APIs that send CORS
// headers are called directly and the rest go through the site's own
// pass-through (/api/fetch); in the MCP endpoint everything is direct.

export interface Net {
  /** For APIs that allow browsers (Crossref, OpenAlex, Semantic Scholar, Unpaywall). */
  direct(url: string, init?: RequestInit): Promise<Response>;
  /** For everything else: arXiv, publisher pages, PDFs. */
  passThrough(url: string): Promise<Response>;
}

export const browserNet = (origin = ""): Net => ({
  direct: (url, init) => fetch(url, init),
  passThrough: (url) => fetch(`${origin}/api/fetch?url=${encodeURIComponent(url)}`),
});

export const serverNet: Net = {
  direct: (url, init) => fetch(url, init),
  passThrough: (url) => fetch(url, { headers: { "user-agent": "lightkone (+https://symbola.sh/packs/kausalflow/lightkone/)" } }),
};
