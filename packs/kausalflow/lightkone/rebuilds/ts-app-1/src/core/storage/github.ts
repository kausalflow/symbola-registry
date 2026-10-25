// A private GitHub repository through the REST API. Every write is a commit.
// Works in a Worker too, for the MCP endpoint.
import type { StorageAdapter, StorageProvider } from "./adapter.ts";
import { StorageError, base64ToBytes, bytesToBase64, joinPath, toBytes } from "./adapter.ts";

export interface GitHubConfig {
  repo: string; // owner/name
  token: string;
  branch?: string;
  folder?: string;
  /** A folder of .bib files to import on open (flow 2). */
  bibFolder?: string;
}

const API = "https://api.github.com";

function encodePath(p: string) {
  return p.split("/").map(encodeURIComponent).join("/");
}

export class GitHubStorage implements StorageAdapter {
  readonly label: string;
  private shas = new Map<string, string>();

  constructor(private config: GitHubConfig) {
    if (!/^[\w.-]+\/[\w.-]+$/.test(config.repo ?? "") || !config.token) {
      throw new StorageError("The repository needs an owner/name and a token.");
    }
    this.label = `GitHub ${config.repo}${config.folder ? "/" + config.folder.replace(/^\/+|\/+$/g, "") : ""}`;
  }

  get bibFolder(): string | undefined {
    return this.config.bibFolder?.replace(/^\/+|\/+$/g, "") || undefined;
  }

  private headers(extra: Record<string, string> = {}) {
    return {
      authorization: `Bearer ${this.config.token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      ...extra,
    };
  }

  private ref() {
    return this.config.branch ? `?ref=${encodeURIComponent(this.config.branch)}` : "";
  }

  private full(path: string) {
    return joinPath(this.config.folder, path);
  }

  async call(method: string, url: string, body?: unknown, accept?: string): Promise<Response> {
    try {
      return await fetch(`${API}${url}`, {
        method,
        headers: this.headers({ ...(accept ? { accept } : {}), ...(body ? { "content-type": "application/json" } : {}) }),
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
      });
    } catch (e) {
      throw new StorageError(`Cannot reach GitHub (${(e as Error).message}).`);
    }
  }

  /** Reads a path relative to the repository root, not the library folder. */
  async readRaw(fullPath: string): Promise<Uint8Array | null> {
    const res = await this.call("GET", `/repos/${this.config.repo}/contents/${encodePath(fullPath)}${this.ref()}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new StorageError(`GitHub read of ${fullPath} failed: ${res.status}`, res.status);
    const meta = (await res.json()) as { sha: string; content?: string; encoding?: string; type: string };
    if (meta.type !== "file") return null;
    this.shas.set(fullPath, meta.sha);
    if (meta.encoding === "base64" && meta.content) return base64ToBytes(meta.content);
    // Files over 1 MB come without content: fetch the blob.
    const blob = await this.call("GET", `/repos/${this.config.repo}/git/blobs/${meta.sha}`);
    if (!blob.ok) throw new StorageError(`GitHub read of ${fullPath} failed: ${blob.status}`, blob.status);
    const b = (await blob.json()) as { content: string };
    return base64ToBytes(b.content);
  }

  read(path: string) {
    return this.readRaw(this.full(path));
  }

  async writeRaw(fullPath: string, data: Uint8Array | string, message: string): Promise<void> {
    const body = (sha?: string) => ({
      message,
      content: bytesToBase64(toBytes(data)),
      ...(this.config.branch ? { branch: this.config.branch } : {}),
      ...(sha ? { sha } : {}),
    });
    const url = `/repos/${this.config.repo}/contents/${encodePath(fullPath)}`;
    let sha = this.shas.get(fullPath);
    if (sha === undefined) sha = await this.currentSha(fullPath);
    let res = await this.call("PUT", url, body(sha));
    if (res.status === 409 || res.status === 422) {
      // Our sha is stale: someone committed since we read. Fetch it again.
      sha = await this.currentSha(fullPath);
      res = await this.call("PUT", url, body(sha));
    }
    if (!res.ok) throw new StorageError(`GitHub write of ${fullPath} failed: ${res.status}`, res.status);
    const out = (await res.json()) as { content?: { sha: string } };
    if (out.content?.sha) this.shas.set(fullPath, out.content.sha);
  }

  write(path: string, data: Uint8Array | string): Promise<void> {
    return this.writeRaw(this.full(path), data, `lightkone: update ${path}`);
  }

  private async currentSha(fullPath: string): Promise<string | undefined> {
    const res = await this.call("GET", `/repos/${this.config.repo}/contents/${encodePath(fullPath)}${this.ref()}`, undefined, "application/vnd.github.object+json");
    if (res.status === 404) return undefined;
    if (!res.ok) throw new StorageError(`GitHub read of ${fullPath} failed: ${res.status}`, res.status);
    const meta = (await res.json()) as { sha: string };
    return meta.sha;
  }

  async listRaw(fullPrefix: string): Promise<string[]> {
    const branch = this.config.branch || "HEAD";
    const res = await this.call("GET", `/repos/${this.config.repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
    if (res.status === 404 || res.status === 409) return []; // empty repository
    if (!res.ok) throw new StorageError(`GitHub list failed: ${res.status}`, res.status);
    const tree = (await res.json()) as { tree: { path: string; type: string; sha: string }[] };
    const out: string[] = [];
    for (const t of tree.tree) {
      if (t.type !== "blob" || !t.path.startsWith(fullPrefix)) continue;
      this.shas.set(t.path, t.sha);
      out.push(t.path);
    }
    return out;
  }

  async list(prefix: string): Promise<string[]> {
    const strip = this.full("").length;
    return (await this.listRaw(this.full(prefix))).map((p) => p.slice(strip));
  }

  async remove(path: string): Promise<void> {
    const full = this.full(path);
    const sha = this.shas.get(full) ?? (await this.currentSha(full));
    if (!sha) return;
    const res = await this.call("DELETE", `/repos/${this.config.repo}/contents/${encodePath(full)}`, {
      message: `lightkone: remove ${path}`,
      sha,
      ...(this.config.branch ? { branch: this.config.branch } : {}),
    });
    if (!res.ok && res.status !== 404) throw new StorageError(`GitHub delete of ${path} failed: ${res.status}`, res.status);
    this.shas.delete(full);
  }

  async access(): Promise<"read" | "write"> {
    const res = await this.call("GET", `/repos/${this.config.repo}`);
    if (res.status === 404 || res.status === 401) throw new StorageError("GitHub cannot find the repository with this token.", res.status);
    if (!res.ok) throw new StorageError(`GitHub answered ${res.status}.`, res.status);
    const repo = (await res.json()) as { permissions?: { push?: boolean } };
    // Fine-grained tokens report the repository's permissions, not the
    // token's; a write that is refused later shows as a save error.
    return repo.permissions?.push === false ? "read" : "write";
  }
}

export const githubProvider: StorageProvider = {
  id: "github",
  label: "A private GitHub repository",
  remote: true,
  fields: [
    { key: "repo", label: "Repository", placeholder: "owner/name" },
    { key: "token", label: "Fine-grained token", type: "password", help: "Contents: read and write, for this repository only." },
    { key: "branch", label: "Branch", optional: true, placeholder: "the default branch" },
    { key: "folder", label: "Folder", optional: true, help: "Keep the library under this folder of the repository." },
    { key: "bibFolder", label: "Folder of .bib files to import on open", optional: true },
  ],
  create: (c) => new GitHubStorage(c as unknown as GitHubConfig),
};
