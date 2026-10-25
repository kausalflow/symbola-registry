// pdf.js, loaded on first use: reading PDFs, their first page (to identify
// dropped PDFs) and their text (for search inside PDFs).
import type { PDFDocumentProxy } from "pdfjs-dist";

type PdfJs = typeof import("pdfjs-dist");
let lib: Promise<PdfJs> | null = null;

export function pdfjs(): Promise<PdfJs> {
  lib ??= (async () => {
    const [m, worker] = await Promise.all([import("pdfjs-dist"), import("pdfjs-dist/build/pdf.worker.min.mjs?url")]);
    m.GlobalWorkerOptions.workerSrc = worker.default;
    return m;
  })();
  return lib;
}

export async function openPdf(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  const m = await pdfjs();
  // pdf.js takes ownership of the buffer: give it a copy.
  return m.getDocument({ data: bytes.slice(), isEvalSupported: false, standardFontDataUrl: "/pdfjs/standard_fonts/", cMapUrl: "/pdfjs/cmaps/", cMapPacked: true }).promise;
}

async function pageText(doc: PDFDocumentProxy, n: number): Promise<string> {
  const page = await doc.getPage(n);
  const content = await page.getTextContent();
  let out = "";
  for (const item of content.items) {
    if (!("str" in item)) continue;
    out += item.str + (item.hasEOL ? "\n" : " ");
  }
  return out;
}

/** The first page's text and the PDF's own title and author, if any. */
export async function firstPageText(bytes: Uint8Array): Promise<{ text: string; title?: string; author?: string }> {
  const doc = await openPdf(bytes);
  try {
    const text = await pageText(doc, 1);
    const meta = (await doc.getMetadata().catch(() => null))?.info as { Title?: string; Author?: string } | undefined;
    return { text, title: meta?.Title || undefined, author: meta?.Author || undefined };
  } finally {
    doc.destroy();
  }
}

/** Every page's text, for lightkone/text/<id>.txt. */
export async function documentText(doc: PDFDocumentProxy): Promise<string> {
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) pages.push(await pageText(doc, i));
  return pages.join("\n\f\n").replace(/[ \t]+\n/g, "\n");
}

export async function textOf(bytes: Uint8Array): Promise<string> {
  const doc = await openPdf(bytes);
  try {
    return await documentText(doc);
  } finally {
    doc.destroy();
  }
}
