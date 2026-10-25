// lightkone at /app/: wires the screens to the app state.
import "../styles.css";
import { addDialog, addFiles, bibSyncDialog, citeDialog, readPdfsForSearch, tidyDialog } from "../ui/dialogs.ts";
import { details } from "../ui/details.ts";
import { $, h, toast } from "../ui/dom.ts";
import { list } from "../ui/list.ts";
import { chatsDialog, helpDialog, palette, summarizeDialog, type Command } from "../ui/palette.ts";
import { openReader } from "../ui/reader.ts";
import { settingsDialog } from "../ui/settings.ts";
import { sidebar } from "../ui/sidebar.ts";
import { exportInView, topbar } from "../ui/topbar.ts";
import type { Paper } from "../core/types.ts";
import { app } from "./app.ts";

const root = $("#app")!;
const side = h("aside", { class: "sidebar", id: "sidebar" });
const main = h("main", { class: "list", id: "list" });
const pane = h("section", { class: "details", id: "details", "aria-label": "Paper details" });
const scrim = h("div", { class: "scrim", onclick: () => closeMenu() });

const openPaper = (p: Paper) => {
  app.selected = p.id;
  app.render();
};
const read = (p: Paper) => openReader(app, p);
const closeMenu = () => document.body.classList.remove("menu-open");
const selected = () => app.paper(app.selected);

const actions = {
  add: () => addDialog(app, openPaper),
  chats: () => chatsDialog(app),
  palette: () => palette(app, commands(), openPaper),
  help: () => helpDialog(),
  settings: () => settingsDialog(app),
  menu: () => document.body.classList.toggle("menu-open"),
};
const bar = topbar(app, actions);

const tools = {
  tidy: () => tidyDialog(app, openPaper),
  readForSearch: () => readPdfsForSearch(app, false),
  syncBib: (folder: string) => bibSyncDialog(app, folder),
  add: actions.add,
  cite: () => (selected() ? citeDialog(selected()!) : toast("Select a paper first.")),
  exportBib: () => exportInView(app),
  chats: actions.chats,
  settings: actions.settings,
};

function commands(): Command[] {
  const p = selected();
  const cmds: Command[] = [
    { label: "Add paper", hint: "identifiers, BibTeX, files", run: actions.add },
    { label: "Export .bib of the papers in view", run: tools.exportBib },
    { label: "Go to All papers", run: () => app.setView({ kind: "all" }) },
    { label: "Go to Starred", run: () => app.setView({ kind: "starred" }) },
    { label: "Go to Recently read", run: () => app.setView({ kind: "recent" }) },
    { label: "Go to Trash", run: () => app.setView({ kind: "trash" }) },
    { label: "Tidy up duplicates", run: tools.tidy },
    { label: "Read PDFs for search", run: tools.readForSearch },
    { label: "Chats", run: actions.chats },
    { label: "Settings", run: actions.settings },
    { label: "Help", run: actions.help },
    ...[...app.folders().keys()].map((f) => ({ label: `Open folder ${f}`, run: () => app.setView({ kind: "folder", value: f }) })),
  ];
  if (p) {
    cmds.unshift(
      { label: `Read: ${p.title}`, run: () => read(p) },
      { label: `Cite: ${p.key}`, run: () => citeDialog(p) },
      { label: p.starred ? "Unstar the selected paper" : "Star the selected paper", run: () => app.edit(() => (p.starred ? delete p.starred : (p.starred = true))) },
    );
  }
  return cmds;
}

const paperList = list(app, main, { open: openPaper, read, readForSearch: () => readPdfsForSearch(app, true) });
const drawDetails = details(app, pane, {
  read,
  cite: citeDialog,
  close: () => {
    app.selected = null;
    app.render();
  },
  summarize: (p) => summarizeDialog(app, p),
});

root.append(bar.el, h("div", { class: "body" }, side, main, pane), scrim);

let lastView = "";
app.onChange(() => {
  bar.update();
  const viewKey = JSON.stringify(app.view) + app.query + app.sort;
  if (viewKey !== lastView) paperList.reset();
  lastView = viewKey;
  if (!app.store) return;
  sidebar(app, side, tools, closeMenu);
  paperList.draw();
  drawDetails();
  document.body.classList.toggle("has-selection", Boolean(app.selected));
});

// ── Keys ───────────────────────────────────────────────────────────────
window.addEventListener("keydown", (e) => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as Element).tagName) || (e.target as HTMLElement).isContentEditable;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    if (!document.querySelector("dialog[open]")) actions.palette();
    return;
  }
  if (typing || document.querySelector("dialog[open]") || document.body.classList.contains("reading")) return;
  if (e.key === "/") {
    e.preventDefault();
    bar.focusSearch();
  } else if (e.key === "?") {
    e.preventDefault();
    actions.help();
  }
});

// ── Drop PDFs or .bib files anywhere (flow 5) ──────────────────────────
let dragDepth = 0;
window.addEventListener("dragenter", (e) => {
  if (!e.dataTransfer?.types.includes("Files")) return;
  dragDepth++;
  document.body.classList.add("dropping");
});
window.addEventListener("dragleave", () => {
  if (--dragDepth <= 0) document.body.classList.remove("dropping");
});
window.addEventListener("dragover", (e) => {
  if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
});
window.addEventListener("drop", (e) => {
  dragDepth = 0;
  document.body.classList.remove("dropping");
  const files = [...(e.dataTransfer?.files ?? [])];
  if (!files.length) return;
  e.preventDefault();
  toast(`Adding ${files.length} file${files.length === 1 ? "" : "s"}…`);
  addFiles(app, files, openPaper);
});

// For plugins and tests: the running app.
(window as unknown as { lightkone: typeof app }).lightkone = app;

// ── Start ──────────────────────────────────────────────────────────────
await app.start();

// The share target (Android) and the + Lightkone bookmarklet open Add paper.
const params = new URLSearchParams(location.search);
const shared = params.get("add") ?? [params.get("share_url"), params.get("share_text")].filter(Boolean).join("\n");
if (shared) {
  history.replaceState(null, "", location.pathname);
  const urls = shared.match(/https?:\/\/\S+/g);
  addDialog(app, openPaper, urls ? urls.join("\n") : shared);
}
const readHash = /^#read\/(.+)$/.exec(location.hash);
if (readHash && app.paper(readHash[1])) read(app.paper(readHash[1])!);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register("/sw.js").catch(() => undefined);
}
