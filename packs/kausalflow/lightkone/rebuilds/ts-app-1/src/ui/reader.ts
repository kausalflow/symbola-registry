// The reader: the PDF full screen with pdf.js, zoom, dark pages, and text
// selection with Highlight, Highlight + note and, with a Claude key, Explain.
// Highlights go to lightkone/annotations/<id>.json, never into the PDF.
// Saved web pages open as their Markdown, or as the saved HTML in a sandbox
// with no scripts.
import type { PDFDocumentProxy } from "pdfjs-dist";
import "pdfjs-dist/web/pdf_viewer.css";
import type { App } from "../app/app.ts";
import { claude, paperContext } from "../app/claude.ts";
import { pdfBytes } from "../app/files.ts";
import { documentText, openPdf, pdfjs } from "../app/pdf.ts";
import { loadAnnotations, saveMerged, type AnnotationFile, type Highlight, type Rect } from "../core/annotations.ts";
import { readText } from "../core/storage/adapter.ts";
import type { Paper } from "../core/types.ts";
import { h, iconButton, markdownToHtml, replace, toast } from "./dom.ts";

const COLORS = ["#ffd54f", "#81c784", "#64b5f6", "#f48fb1"];

function hid() {
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function openReader(app: App, p: Paper) {
  const close = () => {
    observer?.disconnect();
    doc?.destroy();
    window.removeEventListener("keydown", onKey);
    root.remove();
    document.body.classList.remove("reading");
    history.replaceState(null, "", location.pathname + location.search);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && !document.querySelector("dialog[open]")) close();
    if ((e.key === "+" || e.key === "=") && (e.ctrlKey || e.metaKey)) (e.preventDefault(), zoom(1.15));
    if (e.key === "-" && (e.ctrlKey || e.metaKey)) (e.preventDefault(), zoom(1 / 1.15));
  };
  window.addEventListener("keydown", onKey);
  history.replaceState(null, "", `#read/${p.id}`);

  // Reading records when the paper was opened.
  if (!app.store.readOnly) app.edit(() => (p.opened = new Date().toISOString()));

  let doc: PDFDocumentProxy | null = null;
  let observer: IntersectionObserver | null = null;
  let scale = 1;
  let ann: AnnotationFile = { format: "lightkone-annotations", version: 1, paper: p.id, highlights: [] };
  const pages: { el: HTMLElement; n: number; w: number; h: number; rendered: number }[] = [];

  const content = h("div", { class: "reader-content" });
  const panel = h("aside", { class: "reader-panel" });
  const zoomLabel = h("span", { class: "zoom" }, "100%");
  const dark = h("button", {
    type: "button",
    class: app.settings.darkPages ? "on" : "",
    title: "Dark pages",
    "aria-pressed": String(app.settings.darkPages),
    onclick: () => {
      app.updateSettings({ darkPages: !app.settings.darkPages });
      dark.classList.toggle("on", app.settings.darkPages);
      root.classList.toggle("dark-pages", app.settings.darkPages);
    },
  }, "◐ Dark");
  const toolbar = h(
    "div",
    { class: "reader-bar" },
    iconButton("Close reader (Esc)", "←", close),
    h("span", { class: "reader-title" }, p.title),
    h("span", { class: "spacer" }),
    iconButton("Zoom out", "−", () => zoom(1 / 1.15)),
    zoomLabel,
    iconButton("Zoom in", "+", () => zoom(1.15)),
    dark,
    h("button", { type: "button", onclick: () => root.classList.toggle("panel-open") }, "Highlights"),
  );
  const root = h("div", { class: `reader${app.settings.darkPages ? " dark-pages" : ""}`, role: "dialog", "aria-label": `Reading ${p.title}` }, toolbar, h("div", { class: "reader-main" }, content, panel));
  document.body.append(root);
  document.body.classList.add("reading");

  // ── Saving highlights ──────────────────────────────────────────────
  const persist = async () => {
    if (app.store.readOnly) return toast("This library is read-only: highlights are not saved.");
    try {
      ann = await saveMerged(app.storage, ann);
      if (app.saveState === "offline") toast("Offline: highlights are written on reconnect.");
    } catch (e) {
      toast(`Highlights not saved: ${(e as Error).message}`);
    }
    drawHighlights();
  };

  const drawPanel = () => {
    replace(
      panel,
      h("h3", null, `Highlights (${ann.highlights.length})`),
      ann.highlights.length
        ? h(
            "ul",
            null,
            ann.highlights.map((hl) =>
              h(
                "li",
                { style: `border-color:${hl.color ?? COLORS[0]}` },
                h(
                  "button",
                  { type: "button", class: "link", onclick: () => pages[hl.page - 1]?.el.scrollIntoView({ behavior: "smooth" }) },
                  `p. ${hl.page}`,
                ),
                h("blockquote", null, hl.text),
                hl.note ? h("p", { class: "note" }, hl.note) : null,
              ),
            ),
          )
        : h("p", { class: "hint" }, "Select text to highlight it."),
    );
  };

  const drawHighlights = () => {
    for (const pg of pages) {
      // Pages not rendered yet get their highlights when they render.
      const layer = pg.el.querySelector(".hl-layer");
      if (!layer) continue;
      replace(
        layer,
        ann.highlights
          .filter((hl) => hl.page === pg.n)
          .flatMap((hl) =>
            hl.rects.map((r) =>
              h("div", {
                class: `hl${hl.note ? " has-note" : ""}`,
                style: `left:${r.x * 100}%;top:${r.y * 100}%;width:${r.w * 100}%;height:${r.h * 100}%;background:${hl.color ?? COLORS[0]}`,
                title: hl.note ?? hl.text,
                onclick: (e: MouseEvent) => editHighlight(hl, e),
              }),
            ),
          ),
      );
    }
    drawPanel();
  };

  const popover = h("div", { class: "popover", hidden: true });
  root.append(popover);
  const hidePopover = () => (popover.hidden = true);
  const showPopover = (x: number, y: number, ...children: (Node | null)[]) => {
    replace(popover, ...children);
    popover.hidden = false;
    const r = root.getBoundingClientRect();
    popover.style.left = `${Math.max(8, Math.min(x - r.left, r.width - 300))}px`;
    popover.style.top = `${Math.max(48, y - r.top + 12)}px`;
  };

  function editHighlight(hl: Highlight, e: MouseEvent) {
    e.stopPropagation();
    const note = h("textarea", { rows: 3, placeholder: "Note" }, hl.note ?? "");
    showPopover(
      e.clientX,
      e.clientY,
      h("blockquote", null, hl.text.length > 200 ? hl.text.slice(0, 200) + "…" : hl.text),
      note,
      h(
        "div",
        { class: "row" },
        COLORS.map((c) => h("button", { type: "button", class: "swatch", style: `background:${c}`, title: "Colour", onclick: () => ((hl.color = c), persist()) })),
        h("button", { type: "button", onclick: () => ((hl.note = note.value.trim() || undefined), hidePopover(), persist()) }, "Save note"),
        h(
          "button",
          {
            type: "button",
            class: "danger",
            onclick: () => {
              ann.highlights = ann.highlights.filter((x) => x.id !== hl.id);
              ann.deleted = [...(ann.deleted ?? []), hl.id];
              hidePopover();
              persist();
            },
          },
          "Delete",
        ),
      ),
    );
  }

  // ── Selecting text ─────────────────────────────────────────────────
  const selectionHighlight = (): { page: number; rects: Rect[]; text: string } | null => {
    const sel = document.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    const pageEl = (range.commonAncestorContainer.parentElement ?? (range.commonAncestorContainer as Element))?.closest?.(".page") as HTMLElement | null;
    const startPage = (range.startContainer.parentElement as Element | null)?.closest(".page") as HTMLElement | null;
    const pg = pageEl ?? startPage;
    if (!pg) return null;
    const box = pg.getBoundingClientRect();
    const rects: Rect[] = [];
    for (const r of range.getClientRects()) {
      if (r.width < 1 || r.height < 1) continue;
      const x = Math.max(0, (r.left - box.left) / box.width);
      const y = Math.max(0, (r.top - box.top) / box.height);
      if (x >= 1 || y >= 1) continue;
      rects.push({ x, y, w: Math.min(1 - x, r.width / box.width), h: Math.min(1 - y, r.height / box.height) });
    }
    const text = sel.toString().replace(/\s+/g, " ").trim();
    if (!rects.length || !text) return null;
    return { page: Number(pg.dataset.page), rects: dedupe(rects), text };
  };

  const onSelect = (e: Event) => {
    if ((e.target as Element).closest?.(".popover")) return;
    setTimeout(() => {
      const s = selectionHighlight();
      if (!s) return;
      const sel = document.getSelection()!;
      const r = sel.getRangeAt(0).getBoundingClientRect();
      const add = (withNote: boolean) => {
        const hl: Highlight = { id: hid(), page: s.page, rects: s.rects, text: s.text, color: COLORS[0], created: new Date().toISOString() };
        sel.removeAllRanges();
        if (withNote) {
          const note = h("textarea", { rows: 3, placeholder: "Your note" });
          showPopover(
            r.left,
            r.bottom,
            note,
            h(
              "div",
              { class: "row" },
              h("button", { type: "button", class: "primary", onclick: () => ((hl.note = note.value.trim() || undefined), ann.highlights.push(hl), hidePopover(), persist()) }, "Save"),
              h("button", { type: "button", onclick: hidePopover }, "Cancel"),
            ),
          );
          note.focus();
        } else {
          ann.highlights.push(hl);
          hidePopover();
          persist();
        }
      };
      showPopover(
        r.left,
        r.bottom,
        h("button", { type: "button", onclick: () => add(false) }, "Highlight"),
        h("button", { type: "button", onclick: () => add(true) }, "Highlight + note"),
        app.settings.claudeKey ? h("button", { type: "button", onclick: () => explain(s.text, r) }, "Explain") : null,
      );
    }, 10);
  };

  async function explain(text: string, r: DOMRect) {
    const out = h("div", { class: "explain" }, "Asking Claude…");
    showPopover(r.left, r.bottom, out, h("div", { class: "row" }, h("button", { type: "button", onclick: hidePopover }, "Close")));
    try {
      const answer = await claude(
        app.settings.claudeKey,
        "You explain passages of research papers to a researcher who is reading them. Be concise and concrete; define terms and notation the passage relies on.",
        [{ role: "user", content: `${paperContext(p)}\n\nExplain this passage:\n\n${text}` }],
        { model: app.settings.pluginSettings["claude.model"], maxTokens: 800 },
      );
      out.innerHTML = markdownToHtml(answer);
    } catch (e) {
      out.textContent = (e as Error).message;
    }
  }

  content.addEventListener("mouseup", onSelect);
  content.addEventListener("touchend", onSelect);
  content.addEventListener("mousedown", (e) => {
    if (!(e.target as Element).closest(".popover")) hidePopover();
  });

  // ── Pages ──────────────────────────────────────────────────────────
  async function renderPage(pg: (typeof pages)[number]) {
    if (!doc || pg.rendered === scale) return;
    pg.rendered = scale;
    const m = await pdfjs();
    const page = await doc.getPage(pg.n);
    const viewport = page.getViewport({ scale });
    const ratio = window.devicePixelRatio || 1;
    const canvas = h("canvas", { width: Math.floor(viewport.width * ratio), height: Math.floor(viewport.height * ratio) });
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined }).promise;
    const textLayer = h("div", { class: "textLayer" });
    const old = pg.el.querySelectorAll("canvas, .textLayer");
    old.forEach((n) => n.remove());
    pg.el.prepend(canvas);
    pg.el.append(textLayer);
    await new m.TextLayer({ textContentSource: page.streamTextContent(), container: textLayer, viewport }).render();
    pg.el.querySelector(".hl-layer")?.remove();
    pg.el.append(h("div", { class: "hl-layer" }));
    drawHighlights();
  }

  function layout() {
    zoomLabel.textContent = `${Math.round(scale * 100)}%`;
    for (const pg of pages) {
      pg.el.style.width = `${pg.w * scale}px`;
      pg.el.style.height = `${pg.h * scale}px`;
      pg.el.style.setProperty("--scale-factor", String(scale));
      pg.rendered = 0;
    }
    observer?.disconnect();
    observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) renderPage(pages[Number((e.target as HTMLElement).dataset.page) - 1]);
      },
      { root: content, rootMargin: "600px 0px" },
    );
    for (const pg of pages) observer.observe(pg.el);
  }

  function zoom(f: number) {
    if (!pages.length) return;
    const at = content.scrollTop / Math.max(1, content.scrollHeight);
    scale = Math.min(4, Math.max(0.4, scale * f));
    layout();
    content.scrollTop = at * content.scrollHeight;
  }

  async function loadPdf() {
    content.append(h("p", { class: "loading" }, "Opening the PDF…"));
    const got = await pdfBytes(app, p);
    if (!got) {
      replace(content, h("p", { class: "empty" }, app.saveState === "offline" ? "Offline, and this PDF is not kept on this device." : "The PDF could not be read from storage."));
      return;
    }
    try {
      doc = await openPdf(got.bytes);
    } catch (e) {
      replace(content, h("p", { class: "empty" }, `This PDF could not be opened: ${(e as Error).message}`));
      return;
    }
    ann = await loadAnnotations(app.storage, p.id).catch(() => ann);
    const first = await doc.getPage(1);
    const vp = first.getViewport({ scale: 1 });
    const avail = Math.min(content.clientWidth - 24, 1100);
    scale = Math.max(0.4, Math.min(2.5, avail / vp.width));
    replace(content);
    for (let n = 1; n <= doc.numPages; n++) {
      const pv = n === 1 ? vp : (await doc.getPage(n)).getViewport({ scale: 1 });
      const el = h("div", { class: "page", dataset: { page: String(n) } });
      pages.push({ el, n, w: pv.width, h: pv.height, rendered: 0 });
      content.append(el);
    }
    layout();
    drawPanel();
    // Read the text once, for search inside PDFs, Ask and MCP.
    if (!app.fulltext.has(p.id) && !app.store.readOnly) {
      documentText(doc)
        .then((text) => app.fulltext.store(p.id, text))
        .catch(() => undefined);
    }
  }

  async function loadPage() {
    root.classList.add("page-view");
    const md = p.markdown ? await readText(app.storage, p.markdown).catch(() => null) : null;
    const html = p.html ? await readText(app.storage, p.html).catch(() => null) : null;
    const showMd = () => replace(content, h("article", { class: "markdown" }, ...htmlNodes(markdownToHtml(md ?? "")), p.url ? h("p", { class: "small" }, h("a", { href: p.url, target: "_blank", rel: "noopener" }, p.url)) : null));
    const showHtml = () => {
      // No scripts: an empty sandbox, and a CSP that forbids them too.
      const csp = `<meta http-equiv="Content-Security-Policy" content="script-src 'none'; object-src 'none'; frame-src 'none'">`;
      const frame = h("iframe", { class: "saved-page", sandbox: "", referrerpolicy: "no-referrer", title: "Saved page" });
      frame.srcdoc = csp + (html ?? "");
      replace(content, frame);
    };
    toolbar.insertBefore(
      h(
        "span",
        { class: "seg" },
        md !== null ? h("button", { type: "button", onclick: showMd }, "Reading view") : null,
        html !== null ? h("button", { type: "button", onclick: showHtml }, "Saved page") : null,
      ),
      toolbar.querySelector(".spacer"),
    );
    if (md !== null) showMd();
    else if (html !== null) showHtml();
    else replace(content, h("p", { class: "empty" }, "This page could not be read from storage."));
  }

  if (p.pdf || p.file) loadPdf();
  else loadPage();
}

function htmlNodes(html: string): Node[] {
  const t = document.createElement("template");
  t.innerHTML = html;
  return [...t.content.childNodes];
}

/** Drops rects contained in others (some browsers report both a line and its words). */
function dedupe(rects: Rect[]): Rect[] {
  const eps = 0.002;
  return rects.filter(
    (r, i) =>
      !rects.some(
        (o, j) => j !== i && o.x <= r.x + eps && o.y <= r.y + eps && o.x + o.w >= r.x + r.w - eps && o.y + o.h >= r.y + r.h - eps && (o.w * o.h > r.w * r.h || j < i),
      ),
  );
}
