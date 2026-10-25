// Top bar: the search box, Add paper, Export .bib of the papers in view,
// Chats, the command palette, Help, and the status line.
import { exportBibtex } from "../../impl/bibtex-export/src/index.ts";
import { SORTS, type Sort } from "../../impl/search-query/src/index.ts";
import type { App } from "../app/app.ts";
import { viewLabel } from "../app/app.ts";
import { download, h, iconButton, replace } from "./dom.ts";

export interface TopbarActions {
  add(): void;
  chats(): void;
  palette(): void;
  help(): void;
  settings(): void;
  menu(): void;
}

const SORT_LABELS: Record<Sort, string> = { added: "Newest added", year: "Year", title: "Title", relevance: "Relevance", opened: "Last opened" };

export function exportInView(app: App) {
  const ids = app.results();
  const text = ids.map((id) => exportBibtex(app.paper(id)! as never)).join("\n");
  const name = viewLabel(app.view).replace(/[^\w.-]+/g, "-").replace(/^-|-$/g, "") || "library";
  download(`${name}.bib`, text, "application/x-bibtex");
}

export function topbar(app: App, actions: TopbarActions): { el: HTMLElement; update(): void; focusSearch(): void } {
  let debounce: number | undefined;
  // What this box last put in app.query: the box is overwritten only when
  // something else (the palette, a link) changed the query.
  let typed = app.query;
  const input = h("input", {
    type: "search",
    id: "search",
    placeholder: "Search  (tag:  author:  year:  in:  has:  is:)",
    "aria-label": "Search papers",
    autocomplete: "off",
    spellcheck: "false",
    oninput: () => {
      clearTimeout(debounce);
      debounce = window.setTimeout(() => {
        typed = input.value;
        app.query = input.value;
        app.render();
      }, 120);
    },
  });
  const sort = h(
    "select",
    {
      "aria-label": "Sort",
      title: "Sort",
      onchange: () => {
        app.sort = sort.value as Sort | "";
        app.render();
      },
    },
    h("option", { value: "" }, "Default order"),
    SORTS.map((s) => h("option", { value: s }, SORT_LABELS[s])),
  );
  const status = h("button", { class: "status", type: "button", onclick: actions.settings, title: "Storage and saving" });
  const el = h(
    "header",
    { class: "topbar" },
    iconButton("Menu", "☰", actions.menu, "menu-button"),
    h("a", { class: "brand", href: "/", title: "About lightkone" }, h("img", { src: "/icon.svg", alt: "", width: 22, height: 22 }), h("span", null, "Lightkone")),
    h("div", { class: "searchbox" }, input, sort),
    h("button", { class: "primary", type: "button", onclick: actions.add }, "Add paper"),
    h("button", { type: "button", class: "wide-only", onclick: () => exportInView(app), title: "Download the papers in view as BibTeX" }, "Export .bib"),
    h("button", { type: "button", class: "wide-only", onclick: actions.chats }, "Chats"),
    iconButton("Command palette (Ctrl+K)", "⌘", actions.palette),
    iconButton("Help (?)", "?", actions.help),
    iconButton("Settings", "⚙", actions.settings),
    status,
  );
  const update = () => {
    const label = app.storage?.label ?? "";
    const state: Record<string, string> = {
      opening: "Opening…",
      saving: "Saving…",
      saved: "Saved",
      idle: "",
      offline: "Offline, saves later",
      readonly: "Read-only",
      error: app.openError ? "Cannot open" : "Not saved",
    };
    replace(status, h("span", { class: `dot ${app.saveState}` }), h("span", { class: "status-text" }, [label, state[app.saveState]].filter(Boolean).join(" · ")));
    status.title = app.openError || app.saveError || "Storage and saving";
    if (app.query !== typed) {
      clearTimeout(debounce);
      input.value = typed = app.query;
    }
    sort.value = app.sort;
  };
  return { el, update, focusSearch: () => input.focus() };
}
