// The app's state: settings, plugins, the open library, the view, and the
// save loop. Screens read it and call its methods; it calls render().
import { search, type Sort } from "../../impl/search-query/src/index.ts";
import { addText, type AddEnv } from "../core/add.ts";
import { syncBibs } from "../core/bibsync.ts";
import { examplePapers, isExample } from "../core/examples.ts";
import { FullText } from "../core/fulltext.ts";
import { LibraryStore } from "../core/library.ts";
import { browserNet } from "../core/net.ts";
import { loadPlugins, type LoadedPlugins } from "../core/plugins.ts";
import { loadSettings, saveSettings, type Settings } from "../core/settings.ts";
import type { StorageAdapter } from "../core/storage/adapter.ts";
import { BrowserStorage } from "../core/storage/browser.ts";
import { GitHubStorage } from "../core/storage/github.ts";
import type { Paper } from "../core/types.ts";
import { annotationsPath, isTrashed, textPath } from "../core/types.ts";
import { toast } from "../ui/dom.ts";
import { OfflineError, OfflineStorage } from "./offline.ts";
import { firstPageText } from "./pdf.ts";

export type View =
  | { kind: "all" }
  | { kind: "starred" }
  | { kind: "recent" }
  | { kind: "trash" }
  | { kind: "folder"; value: string }
  | { kind: "tag"; value: string };

const quote = (v: string) => `"${v.replace(/"/g, "")}"`;

export function viewFilter(v: View): string {
  switch (v.kind) {
    case "all":
      return "";
    case "starred":
      return "is:starred";
    case "recent":
      return "is:recent";
    case "trash":
      return "is:trash";
    case "folder":
      return `in:${quote(v.value)}`;
    case "tag":
      return `tag:${quote(v.value)}`;
  }
}

export function viewLabel(v: View): string {
  switch (v.kind) {
    case "all":
      return "All papers";
    case "starred":
      return "Starred";
    case "recent":
      return "Recently read";
    case "trash":
      return "Trash";
    case "folder":
      return v.value;
    case "tag":
      return `#${v.value}`;
  }
}

export type SaveState = "idle" | "saving" | "saved" | "offline" | "error" | "readonly" | "opening";

export class App {
  settings: Settings = loadSettings();
  plugins!: LoadedPlugins;
  store!: LibraryStore;
  storage!: StorageAdapter;
  offline: OfflineStorage | null = null;
  fulltext!: FullText;
  view: View = { kind: "all" };
  query = "";
  sort: Sort | "" = "";
  selected: string | null = null;
  saveState: SaveState = "opening";
  saveError = "";
  openError = "";
  private timer: number | undefined;
  private listeners = new Set<() => void>();

  onChange(fn: () => void) {
    this.listeners.add(fn);
  }

  render() {
    for (const fn of this.listeners) fn();
  }

  get env(): AddEnv {
    return {
      store: this.store,
      ctx: { net: browserNet(), email: this.settings.email || undefined },
      lookups: this.plugins.lookups,
      importers: this.plugins.importers,
      firstPageText,
      onProgress: (m) => toast(m, 6000),
    };
  }

  updateSettings(patch: Partial<Settings>) {
    this.settings = { ...this.settings, ...patch };
    saveSettings(this.settings);
  }

  // ── Opening (flows 1, 2) ─────────────────────────────────────────────

  async start() {
    this.plugins = await loadPlugins(this.settings.plugins);
    for (const e of this.plugins.errors) toast(`Plugin ${e.url} did not load: ${e.error}`, 8000);
    await this.open();
    window.addEventListener("online", () => this.reconnect());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") this.comeBack();
      else if (this.timer !== undefined) this.saveNow();
    });
    window.addEventListener("beforeunload", (e) => {
      if (this.timer !== undefined || this.saveState === "saving") {
        this.saveNow();
        e.preventDefault();
      }
    });
  }

  async open() {
    this.saveState = "opening";
    this.openError = "";
    this.selected = null;
    this.render();
    const provider = this.plugins.storage.find((p) => p.id === this.settings.storage) ?? this.plugins.storage[0];
    try {
      const inner = provider.create(this.settings.storageConfig);
      if (provider.id === "browser") {
        this.storage = inner;
        this.offline = null;
      } else {
        this.offline = new OfflineStorage(inner, `${provider.id}:${inner.label}`);
        await this.offline.init();
        this.offline.onOffline = () => {
          if (this.saveState !== "offline") {
            this.saveState = "offline";
            this.render();
          }
        };
        this.storage = this.offline;
      }
      this.store = new LibraryStore(this.storage);
      this.fulltext = new FullText(this.storage);
      const existed = await this.store.open();
      this.saveState = this.store.readOnly ? "readonly" : "saved";
      if (!existed && provider.id === "browser" && !this.settings.examplesRemoved) {
        this.store.papers.push(...examplePapers());
        this.scheduleSave(0);
      }
      if (this.store.foldered) toast(`${this.store.foldered} papers took their folders from Paperpile paths.`);
      if (inner instanceof GitHubStorage && inner.bibFolder) this.importBibFolder(inner);
      this.fulltext.load().then(() => this.render());
      if (this.offline && navigator.onLine) this.reconnect();
    } catch (e) {
      this.openError = (e as Error).message;
      this.saveState = e instanceof OfflineError ? "offline" : "error";
      this.store = new LibraryStore(new BrowserStorage());
      this.store.readOnly = true;
      this.fulltext = new FullText(this.store.storage);
    }
    this.render();
  }

  /** Flow 2: a GitHub repository's folder of .bib files is imported on open. */
  private async importBibFolder(gh: GitHubStorage) {
    try {
      const folder = gh.bibFolder!;
      const paths = (await gh.listRaw(folder + "/")).filter((p) => p.toLowerCase().endsWith(".bib"));
      let added = 0;
      for (const path of paths) {
        const bytes = await gh.readRaw(path);
        if (!bytes) continue;
        const r = await addText({ ...this.env, fetchPdfs: false, onProgress: undefined }, new TextDecoder().decode(bytes));
        added += r.added.length;
      }
      if (added) {
        toast(`Imported ${added} papers from ${folder}/.`);
        this.changed();
      }
    } catch (e) {
      toast(`Could not import the .bib folder: ${(e as Error).message}`);
    }
  }

  // ── Editing and saving ───────────────────────────────────────────────

  get papers(): Paper[] {
    return this.store.papers;
  }

  paper(id: string | null): Paper | undefined {
    return id ? this.store.byId(id) : undefined;
  }

  /** Changes papers and schedules a save. */
  edit(fn: () => void) {
    if (this.store.readOnly) {
      toast("This library is read-only.");
      return;
    }
    fn();
    this.changed();
  }

  changed() {
    this.scheduleSave();
    this.render();
  }

  scheduleSave(ms = 800) {
    if (this.store.readOnly) return;
    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.saveNow(), ms);
  }

  async saveNow() {
    clearTimeout(this.timer);
    this.timer = undefined;
    if (this.store.readOnly) return;
    this.saveState = "saving";
    this.render();
    try {
      const { fromThem } = await this.store.save();
      this.saveState = "saved";
      this.saveError = "";
      if (fromThem) toast(`${fromThem} paper${fromThem === 1 ? "" : "s"} changed on another device and ${fromThem === 1 ? "was" : "were"} merged in.`);
      this.afterSave();
    } catch (e) {
      if (e instanceof OfflineError || !navigator.onLine) {
        this.saveState = "offline";
      } else {
        this.saveState = "error";
        this.saveError = (e as Error).message;
        // Try again later; the next save merges whatever happened meanwhile.
        this.timer = window.setTimeout(() => this.saveNow(), 30_000);
      }
    }
    this.render();
  }

  private syncing = false;
  private async afterSave() {
    const lib = this.store.data;
    if (!lib.bibSync?.length || this.syncing) return;
    if (!this.settings.bibSyncToken) return;
    this.syncing = true;
    try {
      const results = await syncBibs(lib, this.settings.bibSyncToken);
      for (const r of results) {
        if (r.error) toast(`Sync of ${r.target.folder} to ${r.target.repo} failed: ${r.error}`, 6000);
        else if (r.written) toast(`Synced ${r.target.folder} to ${r.target.repo}/${r.target.path}`);
      }
    } finally {
      this.syncing = false;
    }
  }

  /** Resolves once no save is scheduled or running (for tests and plugins). */
  async idle(): Promise<void> {
    for (;;) {
      if (this.timer === undefined && this.saveState !== "saving") return;
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  /** Flow 12: coming back to the tab picks up changes made elsewhere. */
  async comeBack() {
    if (!this.store || this.saveState === "opening" || this.saveState === "error") return;
    try {
      const n = await this.store.refresh();
      if (n) {
        toast(`${n} paper${n === 1 ? "" : "s"} changed on another device.`);
        this.fulltext.load().then(() => this.render());
        this.render();
      }
    } catch {
      /* offline: nothing to pick up */
    }
  }

  async reconnect() {
    if (!this.offline) return;
    try {
      const { mergeQueuedAnnotations } = await import("./annotation-sync.ts");
      const n = await this.offline.flush((path, ours) => mergeQueuedAnnotations(this.offline!, path, ours));
      if (n) toast(`Wrote ${n} change${n === 1 ? "" : "s"} made offline.`);
    } catch {
      return;
    }
    if (this.store.dirty || this.saveState === "offline") await this.saveNow();
    else await this.comeBack();
  }

  // ── Finding (flow 6) ─────────────────────────────────────────────────

  fullQuery(): string {
    return [viewFilter(this.view), this.query].filter(Boolean).join(" ");
  }

  results(): string[] {
    return this.fulltext.search(this.papers, this.fullQuery(), this.sort || undefined);
  }

  /** Papers in view without full text, when the query has words. */
  unreadForSearch(): Paper[] {
    const q = this.query.trim();
    if (!q) return [];
    const inView = new Set(search(this.papers as never, viewFilter(this.view), "added"));
    return this.fulltext.unread(this.papers.filter((p) => inView.has(p.id)));
  }

  setView(v: View) {
    this.view = v;
    this.render();
  }

  // ── Organizing (flow 7) ──────────────────────────────────────────────

  trash(p: Paper) {
    this.edit(() => {
      p.trashed = new Date().toISOString();
    });
  }

  restore(p: Paper) {
    this.edit(() => {
      delete p.trashed;
    });
  }

  /** Emptying the trash deletes for good: the papers and the files lightkone made for them. */
  async emptyTrash() {
    const gone = this.papers.filter(isTrashed);
    this.edit(() => {
      this.store.data.papers = this.papers.filter((p) => !isTrashed(p));
    });
    await this.removeFiles(gone);
    if (gone.some((p) => p.id === this.selected)) this.selected = null;
    this.render();
  }

  async removeExamples() {
    const gone = this.papers.filter(isExample);
    this.updateSettings({ examplesRemoved: true });
    this.edit(() => {
      this.store.data.papers = this.papers.filter((p) => !isExample(p));
    });
    await this.removeFiles(gone);
  }

  private async removeFiles(papers: Paper[]) {
    if (!this.storage.remove) return;
    for (const p of papers) {
      const paths = [p.pdf, p.html, p.markdown, annotationsPath(p.id), textPath(p.id)].filter((x): x is string => Boolean(x));
      for (const path of paths) await this.storage.remove(path).catch(() => undefined);
    }
  }

  /** Folders in use, with their paper counts (trash left out). */
  folders(): Map<string, number> {
    const m = new Map<string, number>();
    for (const p of this.papers) if (!isTrashed(p)) for (const f of p.folders ?? []) m.set(f, (m.get(f) ?? 0) + 1);
    return m;
  }

  /** Tags, most used first. */
  tags(): [string, number][] {
    const m = new Map<string, number>();
    for (const p of this.papers) if (!isTrashed(p)) for (const t of p.tags) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }
}

export const app = new App();
