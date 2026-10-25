// Flow 11: a folder's .bib kept in a GitHub repository. Targets live in
// library.json's bibSync; the app rewrites each file with a commit whenever
// the folder's papers change (and only then: the stored file is compared first).
import { exportBibtex } from "../../impl/bibtex-export/src/index.ts";
import { search } from "../../impl/search-query/src/index.ts";
import { GitHubStorage } from "./storage/github.ts";
import type { BibSyncTarget, Library } from "./types.ts";

export const folderQuery = (folder: string) => `in:"${folder.replace(/"/g, "")}"`;

/** The .bib of a folder (and the folders inside it), outside the trash, in library order. */
export function folderBib(lib: Library, folder: string): string {
  const ids = new Set(search(lib.papers as never, folderQuery(folder), "added"));
  return lib.papers.filter((p) => ids.has(p.id)).map((p) => exportBibtex(p as never)).join("\n");
}

export interface SyncOutcome {
  target: BibSyncTarget;
  written: boolean;
  error?: string;
}

export async function syncBibs(lib: Library, token: string): Promise<SyncOutcome[]> {
  const out: SyncOutcome[] = [];
  for (const target of lib.bibSync ?? []) {
    try {
      const gh = new GitHubStorage({ repo: target.repo, token, branch: target.branch });
      const text = folderBib(lib, target.folder);
      const stored = await gh.readRaw(target.path);
      if (stored && new TextDecoder().decode(stored) === text) {
        out.push({ target, written: false });
        continue;
      }
      await gh.writeRaw(target.path, text, `lightkone: sync ${target.folder}`);
      out.push({ target, written: true });
    } catch (e) {
      out.push({ target, written: false, error: (e as Error).message });
    }
  }
  return out;
}
