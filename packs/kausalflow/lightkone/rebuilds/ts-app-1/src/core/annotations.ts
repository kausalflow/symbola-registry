// Highlights and their notes on one paper's PDF, in
// lightkone/annotations/<paper id>.json; never written into the PDF.
import type { StorageAdapter } from "./storage/adapter.ts";
import { readJson } from "./storage/adapter.ts";
import { annotationsPath } from "./types.ts";

export interface Rect {
  /** Fractions of the page's width and height, so they hold at any zoom. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Highlight {
  id: string;
  page: number;
  rects: Rect[];
  text: string;
  note?: string;
  color?: string;
  created: string;
}

export interface AnnotationFile {
  format: "lightkone-annotations";
  version: 1;
  paper: string;
  highlights: Highlight[];
  /** Ids of highlights deleted, so a merge does not bring them back. */
  deleted?: string[];
}

export async function loadAnnotations(s: StorageAdapter, paperId: string): Promise<AnnotationFile> {
  const doc = await readJson<AnnotationFile>(s, annotationsPath(paperId));
  if (doc && Array.isArray(doc.highlights)) return doc;
  return { format: "lightkone-annotations", version: 1, paper: paperId, highlights: [] };
}

export async function saveAnnotations(s: StorageAdapter, doc: AnnotationFile): Promise<void> {
  await s.write(annotationsPath(doc.paper), JSON.stringify(doc, null, 1), "application/json");
}

/**
 * Merges the stored file with this device's: highlights are kept by id, so a
 * highlight made on another device is not lost; ours wins for the same id,
 * and deleted ones stay deleted on both.
 */
export function mergeAnnotations(stored: AnnotationFile, ours: AnnotationFile): AnnotationFile {
  const deleted = new Set([...(stored.deleted ?? []), ...(ours.deleted ?? [])]);
  const byId = new Map(stored.highlights.map((h) => [h.id, h]));
  for (const h of ours.highlights) byId.set(h.id, h);
  for (const id of deleted) byId.delete(id);
  const highlights = [...byId.values()].sort((a, b) => a.page - b.page || (a.rects[0]?.y ?? 0) - (b.rects[0]?.y ?? 0));
  return { ...ours, highlights, ...(deleted.size ? { deleted: [...deleted] } : {}) };
}

/** Saves this device's highlights merged into what is stored now. */
export async function saveMerged(s: StorageAdapter, ours: AnnotationFile): Promise<AnnotationFile> {
  const stored = await loadAnnotations(s, ours.paper).catch(() => null);
  const doc = stored ? mergeAnnotations(stored, ours) : ours;
  await saveAnnotations(s, doc);
  return doc;
}
