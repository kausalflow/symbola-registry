// Opening and saving the library (PRODUCT.md, flows: "Save"). Runs in the
// browser and in the MCP endpoint alike.
//
// Save: read library.json again, merge this device's changes into what is
// stored now with library-merge (base = what this device last read or wrote),
// write it with library-file, which also rewrites library.bib.
import { loadLibrary, saveLibrary } from "../../impl/library-file/src/index.ts";
import { mergeLibraries } from "../../impl/library-merge/src/index.ts";
import type { StorageAdapter } from "./storage/adapter.ts";
import { readText } from "./storage/adapter.ts";
import type { Library, Paper } from "./types.ts";
import { LIBRARY_BIB, LIBRARY_JSON } from "./types.ts";

export function emptyLibrary(): Library {
  return { format: "lightkone-library", version: 1, papers: [] };
}

const clone = <T>(x: T): T => structuredClone(x);

export interface SaveResult {
  written: boolean;
  /** Papers that took a change made elsewhere. */
  fromThem: number;
}

export class LibraryStore {
  /** This device's library: what the app shows and edits. */
  data: Library = emptyLibrary();
  readOnly = false;
  /** How many papers took folders from Paperpile paths on the last read. */
  foldered = 0;
  /** What this device last read or wrote, for three-way merges. */
  private base: Library | null = null;
  /** library.json's text as last read or written. */
  private storedText: string | null = null;
  private saving: Promise<SaveResult> | null = null;

  constructor(readonly storage: StorageAdapter) {}

  get papers(): Paper[] {
    return this.data.papers;
  }

  /** Flow 1: read library.json with library-file. False when there is none yet. */
  async open(): Promise<boolean> {
    if (this.storage.access) this.readOnly = (await this.storage.access()) === "read";
    const text = await readText(this.storage, LIBRARY_JSON);
    if (text === null) {
      this.data = emptyLibrary();
      this.base = null;
      this.storedText = null;
      return false;
    }
    const { data, foldered } = loadLibrary(text);
    this.foldered = foldered;
    // The base is the file as stored, so folders gained on load count as
    // this device's change and are written on the next save.
    this.base = parseStored(text);
    this.storedText = text;
    this.data = data as Library;
    return true;
  }

  /** Reads what is stored; null when it has not changed since this device last read or wrote it. */
  private async readTheirs(): Promise<{ text: string | null; theirs: Library | null; changed: boolean }> {
    const text = await readText(this.storage, LIBRARY_JSON);
    if (text === this.storedText) return { text, theirs: this.base && clone(this.base), changed: false };
    if (text === null) return { text, theirs: emptyLibrary(), changed: true };
    return { text, theirs: loadLibrary(text).data as Library, changed: true };
  }

  /**
   * Coming back to the tab (flow 12): take changes saved elsewhere into this
   * device's library without writing. Returns how many papers changed.
   */
  async refresh(): Promise<number> {
    if (this.saving) await this.saving.catch(() => undefined);
    const { text, theirs, changed } = await this.readTheirs();
    if (!changed || !theirs) return 0;
    const { file, fromThem } = mergeLibraries(this.base, this.data, theirs);
    this.data = clone(file) as Library;
    // Our unsaved edits are still edits against what is stored now.
    this.base = text === null ? null : parseStored(text);
    this.storedText = text;
    return fromThem;
  }

  /** Saves this device's library, merging with what is stored now. */
  save(): Promise<SaveResult> {
    const run = async (): Promise<SaveResult> => {
      if (this.readOnly) throw new Error("This storage is read-only.");
      const ours = clone(this.data);
      const { text, theirs } = await this.readTheirs();
      const { file, fromThem } = mergeLibraries(this.base, ours, theirs ?? emptyLibrary());
      const out = saveLibrary(file as never, text);
      if (out.written) {
        await this.storage.write(LIBRARY_JSON, out.library, "application/json");
        if (out.bib !== null) await this.storage.write(LIBRARY_BIB, out.bib, "application/x-bibtex");
      }
      const saved = parseStored(out.library);
      // Edits made while saving are kept: merge them onto what was written.
      // (Cloned: the merge may hand back the very objects of `saved`, the new base.)
      this.data = clone(mergeLibraries(ours, this.data, saved).file) as Library;
      this.base = saved;
      this.storedText = out.library;
      return { written: out.written, fromThem };
    };
    const p = (this.saving ?? Promise.resolve()).catch(() => undefined).then(run);
    this.saving = p;
    p.finally(() => {
      if (this.saving === p) this.saving = null;
    }).catch(() => undefined);
    return p;
  }

  /** Whether this device holds edits that are not saved. */
  get dirty(): boolean {
    if (!this.base) return this.data.papers.length > 0;
    return JSON.stringify(this.data) !== JSON.stringify(this.base);
  }

  byId(id: string): Paper | undefined {
    return this.data.papers.find((p) => p.id === id);
  }
}

function parseStored(text: string): Library {
  // The stored file as merge sees it: format and version as library-file
  // reads them (a file without them is read as version 1).
  const raw = JSON.parse(text);
  return { ...raw, format: "lightkone-library", version: 1 } as Library;
}

/** A new paper id: unique, short, URL- and path-safe. */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 14);
}
