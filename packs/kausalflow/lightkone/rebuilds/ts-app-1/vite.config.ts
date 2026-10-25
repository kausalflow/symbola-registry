import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, type Plugin } from "vite";
import { passThrough } from "./server/passthrough.ts";
import { mcpKey, newMcpKey, type McpEnv } from "./server/mcp-key.ts";
import { mcp } from "./server/mcp.ts";

// In development, the same /api/ and /mcp/ handlers the Pages Functions run.
async function devEnv(): Promise<McpEnv> {
  if (process.env.MCP_PRIVATE_KEY) return { MCP_PRIVATE_KEY: process.env.MCP_PRIVATE_KEY };
  const file = ".dev/mcp-key.json";
  if (!existsSync(file)) {
    mkdirSync(".dev", { recursive: true });
    writeFileSync(file, await newMcpKey());
  }
  return { MCP_PRIVATE_KEY: readFileSync(file, "utf8") };
}

async function toRequest(req: IncomingMessage): Promise<Request> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
  const body = chunks.length && req.method !== "GET" && req.method !== "HEAD" ? Buffer.concat(chunks) : undefined;
  return new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers, body });
}

async function send(res: ServerResponse, r: Response) {
  res.statusCode = r.status;
  r.headers.forEach((v, k) => res.setHeader(k, v));
  res.end(Buffer.from(await r.arrayBuffer()));
}

type Next = () => void;
async function route(req: IncomingMessage, res: ServerResponse, next: Next) {
  const path = (req.url ?? "").split("?")[0];
  try {
    if (path === "/api/fetch") return send(res, await passThrough(await toRequest(req)));
    if (path === "/api/mcp-key") return send(res, mcpKey(await toRequest(req), await devEnv()));
    const m = /^\/mcp\/([^/]+)$/.exec(path);
    if (m) return send(res, await mcp(await toRequest(req), await devEnv(), m[1]));
  } catch (e) {
    res.statusCode = 500;
    return res.end(String(e));
  }
  next();
}

const functions = (): Plugin => ({
  name: "lightkone-functions",
  configureServer(server) {
    server.middlewares.use(route);
  },
  configurePreviewServer(server) {
    server.middlewares.use(route);
  },
});

// The offline shell: every built file, for the service worker to cache.
const precache = (): Plugin => ({
  name: "lightkone-precache",
  apply: "build",
  closeBundle() {
    const out = "dist";
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else files.push("/" + relative(out, p).split("\\").join("/"));
      }
    };
    walk(out);
    const list = files.filter((f) => !/\.map$|^\/precache\.json$|^\/sw\.js$|^\/_/.test(f) && !f.startsWith("/pdfjs/cmaps/"));
    writeFileSync(join(out, "precache.json"), JSON.stringify({ version: Date.now().toString(36), files: ["/app/", ...list] }));
  },
});

export default defineConfig({
  plugins: [functions(), precache()],
  build: {
    target: "es2022",
    rollupOptions: { input: { index: "index.html", app: "app/index.html" } },
  },
  worker: { format: "es" },
});
