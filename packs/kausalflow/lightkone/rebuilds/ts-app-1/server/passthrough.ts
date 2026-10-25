// /api/fetch?url=...: a stateless pass-through for what browsers cannot fetch
// themselves (arXiv's API and PDFs, publisher pages). It holds no data,
// forwards no cookies or credentials, and answers only the site's own pages.

const MAX_BYTES = 80 * 1024 * 1024;

/** Whether a request comes from one of the site's own pages. */
export function fromOwnSite(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

function privateHost(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local")) return true;
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.)/.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (h === "::1" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80")) return h.includes(":");
  return false;
}

export async function passThrough(req: Request): Promise<Response> {
  if (req.method !== "GET") return new Response("GET only", { status: 405 });
  if (!fromOwnSite(req)) return new Response("This pass-through answers lightkone's own pages only.", { status: 403 });
  const target = new URL(req.url).searchParams.get("url") ?? "";
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return new Response("url must be an http(s) link", { status: 400 });
  }
  if (!/^https?:$/.test(url.protocol) || privateHost(url.hostname)) return new Response("url must be a public http(s) link", { status: 400 });
  let res: Response;
  try {
    res = await fetch(url.href, {
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; lightkone; +https://symbola.sh/packs/kausalflow/lightkone/)",
        accept: req.headers.get("accept") ?? "*/*",
      },
    });
  } catch (e) {
    return new Response(`Cannot reach ${url.host}: ${(e as Error).message}`, { status: 502 });
  }
  const length = Number(res.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) return new Response("Too large", { status: 413 });
  const headers = new Headers();
  for (const h of ["content-type", "content-length", "last-modified"]) {
    const v = res.headers.get(h);
    if (v) headers.set(h, v);
  }
  headers.set("x-final-url", res.url);
  headers.set("cache-control", "no-store");
  return new Response(res.body, { status: res.status, headers });
}
