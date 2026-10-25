// The MCP endpoint, /mcp/<token> (flow 13): Streamable HTTP, stateless JSON
// replies. The token is the owner's storage settings sealed with the site's
// key; the endpoint opens the library in that storage for each call, and
// writes go through the same save as the app's (re-read, library-merge,
// library-file).
import { exportBibtex } from "../impl/bibtex-export/src/index.ts";
import { search, type Sort } from "../impl/search-query/src/index.ts";
import { addText } from "../src/core/add.ts";
import { LibraryStore } from "../src/core/library.ts";
import { openOnSite, type McpSecret } from "../src/core/mcp-address.ts";
import { serverNet } from "../src/core/net.ts";
import { readText, type StorageAdapter } from "../src/core/storage/adapter.ts";
import { githubProvider } from "../src/core/storage/github.ts";
import { s3Provider } from "../src/core/storage/s3.ts";
import type { Paper } from "../src/core/types.ts";
import { textPath } from "../src/core/types.ts";
import { privateJwk, type McpEnv } from "./mcp-key.ts";

const PROTOCOL = "2025-06-18";
const SORTS = ["added", "year", "title", "relevance", "opened"];

type Json = Record<string, unknown>;

const TOOLS = [
  {
    name: "search_papers",
    description:
      "Search the library with lightkone's query language: words, and filters tag:, author:, year:2020 or year:2018-2021, in:Folder, has:pdf|abstract|arxiv|notes, no:..., is:starred|recent|trash. Quote values with spaces: tag:\"deep learning\".",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to type in the search box; empty lists the library." },
        sort: { type: "string", enum: SORTS, description: "Order; default newest added (relevance with words)." },
        limit: { type: "number", description: "At most this many results (default 25)." },
      },
    },
  },
  {
    name: "get_paper",
    description: "One paper's full record and BibTeX entry, by id or citation key.",
    inputSchema: { type: "object", properties: { id: { type: "string", description: "Paper id or citation key." } }, required: ["id"] },
  },
  {
    name: "read_paper",
    description: "A paper's text (from its PDF, once lightkone has read it, or a saved web page), in pages of characters.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" }, offset: { type: "number", description: "Character to start at (default 0)." }, length: { type: "number", description: "Characters to return (default 20000)." } },
      required: ["id"],
    },
  },
  { name: "list_tags", description: "Every tag in the library with how many papers carry it, most used first.", inputSchema: { type: "object", properties: {} } },
  {
    name: "add_paper",
    description: "Add papers by arXiv id, DOI, link or BibTeX (one per line). A paper already in the library is not added twice.",
    inputSchema: {
      type: "object",
      properties: { identifier: { type: "string", description: "arXiv ids, DOIs or links, one per line, or BibTeX." }, tags: { type: "array", items: { type: "string" } } },
      required: ["identifier"],
    },
  },
  {
    name: "tag_papers",
    description: "Add and remove tags on papers.",
    inputSchema: {
      type: "object",
      properties: { ids: { type: "array", items: { type: "string" }, description: "Paper ids or citation keys." }, add: { type: "array", items: { type: "string" } }, remove: { type: "array", items: { type: "string" } } },
      required: ["ids"],
    },
  },
  {
    name: "add_note",
    description: "Append a note to a paper's notes.",
    inputSchema: { type: "object", properties: { id: { type: "string" }, note: { type: "string" } }, required: ["id", "note"] },
  },
];

function storageFor(secret: McpSecret): StorageAdapter {
  const provider = [s3Provider, githubProvider].find((p) => p.id === secret.storage);
  if (!provider) throw new Error(`MCP works with a bucket or GitHub storage, not ${secret.storage}.`);
  return provider.create(secret.config);
}

function summary(p: Paper) {
  return { id: p.id, key: p.key, title: p.title, authors: p.authors, year: p.year, venue: p.venue, tags: p.tags, folders: p.folders, starred: p.starred || undefined, hasPdf: Boolean(p.pdf || p.file) };
}

function find(store: LibraryStore, idOrKey: string): Paper {
  const p = store.papers.find((x) => x.id === idOrKey) ?? store.papers.find((x) => x.key === idOrKey);
  if (!p) throw new Error(`No paper with id or key ${idOrKey}`);
  return p;
}

async function callTool(name: string, args: Json, secret: McpSecret): Promise<unknown> {
  const store = new LibraryStore(storageFor(secret));
  await store.open();
  const write = async () => {
    if (store.readOnly) throw new Error("The library's storage is read-only.");
    await store.save();
  };
  switch (name) {
    case "search_papers": {
      const sort = SORTS.includes(String(args.sort)) ? (args.sort as Sort) : undefined;
      const ids = search(store.papers as never, String(args.query ?? ""), sort);
      const limit = Math.max(1, Math.min(200, Number(args.limit) || 25));
      return { total: ids.length, papers: ids.slice(0, limit).map((id) => summary(store.byId(id)!)) };
    }
    case "get_paper": {
      const p = find(store, String(args.id));
      return { paper: p, bibtex: exportBibtex(p as never) };
    }
    case "read_paper": {
      const p = find(store, String(args.id));
      let text = await readText(store.storage, textPath(p.id));
      if (text === null && p.markdown) text = await readText(store.storage, p.markdown);
      if (text === null) return { id: p.id, text: null, abstract: p.abstract ?? null, note: "lightkone has not read this paper's PDF yet: open it in lightkone, or use Read PDFs for search in the results list." };
      const offset = Math.max(0, Number(args.offset) || 0);
      const length = Math.max(1, Math.min(100_000, Number(args.length) || 20_000));
      return { id: p.id, total: text.length, offset, text: text.slice(offset, offset + length) };
    }
    case "list_tags": {
      const counts = new Map<string, number>();
      for (const p of store.papers) if (!p.trashed) for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
      return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([tag, papers]) => ({ tag, papers }));
    }
    case "add_paper": {
      const tags = Array.isArray(args.tags) ? args.tags.map(String) : [];
      const report = await addText({ store, ctx: { net: serverNet, email: secret.email } }, String(args.identifier ?? ""), tags);
      await write();
      return { added: report.added.map(summary), alreadyInLibrary: report.existing.map(summary), failed: report.failed };
    }
    case "tag_papers": {
      const ids = Array.isArray(args.ids) ? args.ids.map(String) : [];
      const add = Array.isArray(args.add) ? args.add.map(String).filter(Boolean) : [];
      const remove = new Set(Array.isArray(args.remove) ? args.remove.map(String) : []);
      const changed = ids.map((id) => {
        const p = find(store, id);
        p.tags = [...p.tags.filter((t) => !remove.has(t)), ...add.filter((t) => !p.tags.includes(t))];
        return summary(p);
      });
      await write();
      return { papers: changed };
    }
    case "add_note": {
      const p = find(store, String(args.id));
      const note = String(args.note ?? "").trim();
      p.notes = p.notes ? `${p.notes}\n\n${note}` : note;
      await write();
      return { id: p.id, notes: p.notes };
    }
  }
  throw new Error(`Unknown tool ${name}`);
}

async function handle(msg: Json, secret: McpSecret): Promise<Json | null> {
  const id = msg.id as string | number | undefined;
  const method = String(msg.method ?? "");
  if (id === undefined || id === null) return null; // a notification
  const ok = (result: unknown) => ({ jsonrpc: "2.0", id, result });
  switch (method) {
    case "initialize": {
      const asked = (msg.params as Json | undefined)?.protocolVersion;
      return ok({
        protocolVersion: typeof asked === "string" ? asked : PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "lightkone", version: "1.0.0" },
        instructions: "The owner's research-paper library. Search it with search_papers; cite papers by their key.",
      });
    }
    case "ping":
      return ok({});
    case "tools/list":
      return ok({ tools: TOOLS });
    case "tools/call": {
      const params = (msg.params ?? {}) as Json;
      try {
        const result = await callTool(String(params.name), (params.arguments ?? {}) as Json, secret);
        return ok({ content: [{ type: "text", text: JSON.stringify(result, null, 1) }], structuredContent: Array.isArray(result) ? { items: result } : result });
      } catch (e) {
        return ok({ content: [{ type: "text", text: (e as Error).message }], isError: true });
      }
    }
  }
  return { jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown method ${method}` } };
}

export async function mcp(req: Request, env: McpEnv, token: string): Promise<Response> {
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type, mcp-protocol-version, mcp-session-id, authorization", "access-control-allow-methods": "POST, OPTIONS" };
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return new Response("POST JSON-RPC messages here.", { status: 405, headers: { ...cors, allow: "POST" } });
  const jwk = privateJwk(env);
  if (!jwk) return new Response("This site has no MCP key.", { status: 503, headers: cors });
  let secret: McpSecret;
  try {
    secret = await openOnSite(token, jwk);
  } catch {
    return new Response("This MCP address is not valid for this site.", { status: 401, headers: cors });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400, headers: cors });
  }
  const batch = Array.isArray(body) ? body : [body];
  const replies = (await Promise.all(batch.map((m) => handle(m as Json, secret)))).filter(Boolean);
  if (!replies.length) return new Response(null, { status: 202, headers: cors });
  return Response.json(Array.isArray(body) ? replies : replies[0], { headers: cors });
}
