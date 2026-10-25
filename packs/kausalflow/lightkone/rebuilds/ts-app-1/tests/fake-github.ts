// An in-memory GitHub contents API, enough for GitHubStorage: for tests.
export class FakeGitHub {
  files = new Map<string, { sha: string; content: Uint8Array }>();
  commits: string[] = [];
  private n = 0;

  constructor(readonly repo = "me/papers") {}

  text(path: string): string | null {
    const f = this.files.get(path);
    return f ? new TextDecoder().decode(f.content) : null;
  }

  put(path: string, text: string) {
    this.files.set(path, { sha: `sha${++this.n}`, content: new TextEncoder().encode(text) });
  }

  async handle(method: string, url: URL, body: string | null): Promise<{ status: number; json?: unknown }> {
    const base = `/repos/${this.repo}`;
    const p = url.pathname;
    if (!p.startsWith(base)) return { status: 404, json: { message: "Not Found" } };
    const rest = p.slice(base.length);
    if (rest === "" && method === "GET") return { status: 200, json: { full_name: this.repo, permissions: { push: true } } };
    if (rest.startsWith("/git/trees/")) {
      return { status: 200, json: { tree: [...this.files].map(([path, f]) => ({ path, type: "blob", sha: f.sha })) } };
    }
    if (rest.startsWith("/git/blobs/")) {
      const sha = rest.slice("/git/blobs/".length);
      const f = [...this.files.values()].find((x) => x.sha === sha);
      return f ? { status: 200, json: { content: Buffer.from(f.content).toString("base64"), encoding: "base64" } } : { status: 404 };
    }
    if (!rest.startsWith("/contents/")) return { status: 404 };
    const path = rest.slice("/contents/".length).split("/").map(decodeURIComponent).join("/");
    const cur = this.files.get(path);
    if (method === "GET") {
      if (!cur) return { status: 404, json: { message: "Not Found" } };
      return { status: 200, json: { type: "file", sha: cur.sha, encoding: "base64", content: Buffer.from(cur.content).toString("base64") } };
    }
    const req = JSON.parse(body ?? "{}");
    if (method === "PUT") {
      if (cur && req.sha !== cur.sha) return { status: 409, json: { message: "sha does not match" } };
      if (!cur && req.sha) return { status: 422, json: { message: "sha given for a new file" } };
      const sha = `sha${++this.n}`;
      this.files.set(path, { sha, content: new Uint8Array(Buffer.from(req.content, "base64")) });
      this.commits.push(req.message);
      return { status: cur ? 200 : 201, json: { content: { sha, path } } };
    }
    if (method === "DELETE") {
      if (!cur) return { status: 404 };
      this.files.delete(path);
      this.commits.push(req.message);
      return { status: 200, json: {} };
    }
    return { status: 405 };
  }

  /** A fetch that answers api.github.com and passes everything else to `next`. */
  fetch(next?: typeof fetch): typeof fetch {
    return (async (input: RequestInfo | URL, init?: RequestInit) => {
      const req = new Request(input, init);
      const url = new URL(req.url);
      if (url.host !== "api.github.com") {
        if (next) return next(input, init);
        throw new TypeError(`fetch blocked in tests: ${url.href}`);
      }
      const body = req.method === "GET" ? null : await req.text();
      const r = await this.handle(req.method, url, body);
      return new Response(r.json === undefined ? null : JSON.stringify(r.json), { status: r.status, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
  }
}
