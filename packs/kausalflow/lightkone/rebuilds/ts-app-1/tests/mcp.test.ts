// The MCP endpoint against an in-memory GitHub repository.
import assert from "node:assert/strict";
import { test } from "node:test";
import { mcp } from "../server/mcp.ts";
import { newMcpKey } from "../server/mcp-key.ts";
import { addDrafts } from "../src/core/add.ts";
import { LibraryStore } from "../src/core/library.ts";
import { sealForSite } from "../src/core/mcp-address.ts";
import { GitHubStorage } from "../src/core/storage/github.ts";
import { FakeGitHub } from "./fake-github.ts";

test("MCP: an AI app searches, adds, tags and notes; writes merge with the app's", async () => {
  const gh = new FakeGitHub();
  const realFetch = globalThis.fetch;
  globalThis.fetch = gh.fetch();
  try {
    const key = await newMcpKey();
    const { d: _d, ...pub } = JSON.parse(key);
    const config = { repo: gh.repo, token: "t0ken" };
    const token = await sealForSite({ storage: "github", config }, pub);
    assert.ok(!token.includes("t0ken"));
    const env = { MCP_PRIVATE_KEY: key };
    let id = 0;
    const call = async (method: string, params?: unknown) => {
      const res = await mcp(new Request(`https://lk.example/mcp/${token}`, { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }) }), env, token);
      return (await res.json()) as { result: any; error?: unknown };
    };
    const tool = async (name: string, args: unknown) => {
      const r = await call("tools/call", { name, arguments: args });
      assert.ok(!r.result.isError, r.result.content?.[0]?.text);
      return JSON.parse(r.result.content[0].text);
    };

    // The app on a device writes the library first.
    const app = new LibraryStore(new GitHubStorage(config));
    await app.open();
    addDrafts(app, [{ title: "Deep Residual Learning for Image Recognition", authors: ["He, Kaiming"], year: 2016, tags: ["vision"] }]);
    await app.save();

    const init = await call("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } });
    assert.equal(init.result.serverInfo.name, "lightkone");
    const notified = await mcp(new Request(`https://lk.example/mcp/${token}`, { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) }), env, token);
    assert.equal(notified.status, 202);
    const tools = (await call("tools/list")).result.tools.map((t: { name: string }) => t.name);
    assert.deepEqual(tools, ["search_papers", "get_paper", "read_paper", "list_tags", "add_paper", "tag_papers", "add_note"]);

    const added = await tool("add_paper", { identifier: "@article{Vaswani2017-at, title={Attention Is All You Need}, author={Vaswani, Ashish}, year={2017}}", tags: ["nlp"] });
    assert.equal(added.added[0].key, "Vaswani2017-at");
    const again = await tool("add_paper", { identifier: "@article{x, title={Attention is all you need}, year={2017}}" });
    assert.equal(again.added.length, 0, "not added twice");

    const found = await tool("search_papers", { query: "attention" });
    assert.equal(found.total, 1);
    await tool("tag_papers", { ids: ["Vaswani2017-at"], add: ["to-read"], remove: ["nlp"] });

    // Meanwhile the app (which has not re-read) stars the first paper and saves: a merge.
    app.papers[0].starred = true;
    const saved = await app.save();
    assert.equal(saved.fromThem, 1);

    await tool("add_note", { id: "Vaswani2017-at", note: "Read section 3." });
    const tags = await tool("list_tags", {});
    assert.deepEqual(tags.map((t: { tag: string }) => t.tag).sort(), ["to-read", "vision"]);
    const paper = await tool("get_paper", { id: "Vaswani2017-at" });
    assert.equal(paper.paper.notes, "Read section 3.");
    assert.match(paper.bibtex, /^@article\{Vaswani2017-at,/);
    const read = await tool("read_paper", { id: "Vaswani2017-at" });
    assert.equal(read.text, null);

    const final = new LibraryStore(new GitHubStorage(config));
    await final.open();
    assert.equal(final.papers.length, 2);
    assert.equal(final.papers[0].starred, true, "the app's star survived the MCP writes");
    assert.deepEqual(final.papers[1].tags, ["to-read"]);
    assert.match(gh.text("lightkone/library.bib")!, /Vaswani2017-at/);
    assert.ok(gh.commits.length >= 4, "every save is a commit");

    const bad = await mcp(new Request(`https://lk.example/mcp/garbage`, { method: "POST", body: "{}" }), env, "garbage");
    assert.equal(bad.status, 401);
  } finally {
    globalThis.fetch = realFetch;
  }
});
