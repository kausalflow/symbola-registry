// Full text (flow 6): a paper's text in lightkone/text/<id>.txt, read from
// its PDF once. search-query decides the results; text only rescues papers
// it dropped because some word matched nowhere in the record.
import { fold, searchWithFullText, type Sort } from "../../impl/search-query/src/index.ts";
import type { StorageAdapter } from "./storage/adapter.ts";
import { readText } from "./storage/adapter.ts";
import type { Paper } from "./types.ts";
import { textPath } from "./types.ts";

export class FullText {
  /** Folded text by paper id, for papers whose text has been read. */
  private texts = new Map<string, string>();
  private known = new Set<string>();
  private loaded = false;

  constructor(private storage: StorageAdapter) {}

  /** Learns which papers have text, and loads it. */
  async load(): Promise<void> {
    const paths = await this.storage.list("lightkone/text/").catch(() => [] as string[]);
    await Promise.all(
      paths.map(async (path) => {
        const id = path.slice("lightkone/text/".length).replace(/\.txt$/, "");
        if (this.known.has(id)) return;
        const text = await readText(this.storage, path).catch(() => null);
        if (text !== null) this.set(id, text, false);
      }),
    );
    this.loaded = true;
  }

  get ready() {
    return this.loaded;
  }

  has(id: string) {
    return this.known.has(id);
  }

  private set(id: string, text: string, _write: boolean) {
    this.known.add(id);
    this.texts.set(id, fold(text));
  }

  async store(id: string, text: string): Promise<void> {
    await this.storage.write(textPath(id), text, "text/plain; charset=utf-8");
    this.set(id, text, true);
  }

  async get(id: string): Promise<string | null> {
    return readText(this.storage, textPath(id));
  }

  /** Papers with a PDF whose text has not been read yet. */
  unread(papers: readonly Paper[]): Paper[] {
    return papers.filter((p) => (p.pdf || p.file) && !p.trashed && !this.known.has(p.id));
  }

  search(papers: readonly Paper[], query: string, sort?: Sort): string[] {
    return searchWithFullText(papers as never, query, sort, (id, words) => {
      const t = this.texts.get(id);
      return t !== undefined && words.every((w) => t.includes(w));
    });
  }
}
