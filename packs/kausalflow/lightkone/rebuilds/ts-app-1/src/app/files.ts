// A paper's PDF and its text, wherever they are stored.
import type { Paper } from "../core/types.ts";
import type { App } from "./app.ts";
import { textOf } from "./pdf.ts";

/** Where a paper's PDF may be: its own pdf, else the Paperpile file paths under papers/. */
export function pdfPaths(p: Paper): string[] {
  const out: string[] = [];
  if (p.pdf) out.push(p.pdf);
  for (const part of (p.file ?? "").split(";")) {
    const t = part.trim();
    if (t && /\.pdf$/i.test(t)) out.push(t.startsWith("papers/") ? t : `papers/${t}`);
  }
  return [...new Set(out)];
}

export async function pdfBytes(app: App, p: Paper): Promise<{ path: string; bytes: Uint8Array } | null> {
  for (const path of pdfPaths(p)) {
    const bytes = await app.storage.read(path).catch(() => null);
    if (bytes) {
      app.offline?.keepPdf(path, bytes).then(() => app.render());
      return { path, bytes };
    }
  }
  return null;
}

/** Reads PDFs into lightkone/text/ for search inside them (flow 6). */
export async function readForSearch(app: App, papers: Paper[], progress: (done: number, total: number) => void): Promise<number> {
  let done = 0;
  let read = 0;
  for (const p of papers) {
    try {
      const pdf = await pdfBytes(app, p);
      if (pdf) {
        await app.fulltext.store(p.id, await textOf(pdf.bytes));
        read++;
      }
    } catch {
      /* an unreadable PDF stays unread */
    }
    progress(++done, papers.length);
  }
  return read;
}
