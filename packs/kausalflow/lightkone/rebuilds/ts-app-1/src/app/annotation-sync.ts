// On reconnect, highlights made offline are merged into what is stored now
// before they are written, so another device's highlights are kept.
import { mergeAnnotations, type AnnotationFile } from "../core/annotations.ts";
import type { OfflineStorage } from "./offline.ts";

export async function mergeQueuedAnnotations(offline: OfflineStorage, path: string, ours: Uint8Array): Promise<Uint8Array> {
  if (!path.startsWith("lightkone/annotations/")) return ours;
  const stored = await offline.readStored(path);
  if (!stored) return ours;
  try {
    const merged = mergeAnnotations(JSON.parse(new TextDecoder().decode(stored)) as AnnotationFile, JSON.parse(new TextDecoder().decode(ours)) as AnnotationFile);
    return new TextEncoder().encode(JSON.stringify(merged, null, 1));
  } catch {
    return ours;
  }
}
