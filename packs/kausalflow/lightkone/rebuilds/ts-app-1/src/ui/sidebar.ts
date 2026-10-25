// Side bar: the views, the folder tree, tags most used first, and the tools.
import type { App, View } from "../app/app.ts";
import { isExample } from "../core/examples.ts";
import { h, replace } from "./dom.ts";

export interface Tools {
  tidy(): void;
  readForSearch(): void;
  syncBib(folder: string): void;
  add(): void;
  cite(): void;
  exportBib(): void;
  chats(): void;
  settings(): void;
}

interface Node {
  name: string;
  path: string;
  count: number;
  children: Map<string, Node>;
}

function tree(folders: Map<string, number>): Node {
  const root: Node = { name: "", path: "", count: 0, children: new Map() };
  for (const [path, count] of [...folders].sort((a, b) => a[0].localeCompare(b[0]))) {
    let at = root;
    const parts = path.split("/").filter(Boolean);
    parts.forEach((part, i) => {
      const p = parts.slice(0, i + 1).join("/");
      if (!at.children.has(part)) at.children.set(part, { name: part, path: p, count: 0, children: new Map() });
      at = at.children.get(part)!;
      if (i === parts.length - 1) at.count += count;
    });
  }
  return root;
}

const same = (a: View, b: View) => a.kind === b.kind && ("value" in a ? a.value : "") === ("value" in b ? b.value : "");

export function sidebar(app: App, el: HTMLElement, tools: Tools, closeMenu: () => void) {
  const item = (v: View, label: string, count?: number, extra?: HTMLElement) =>
    h(
      "li",
      { class: same(app.view, v) ? "active" : "" },
      h(
        "button",
        {
          type: "button",
          onclick: () => {
            app.setView(v);
            closeMenu();
          },
        },
        h("span", { class: "label" }, label),
        count !== undefined ? h("span", { class: "count" }, count) : null,
      ),
      extra,
    );

  const folderNode = (n: Node, depth: number): HTMLElement[] =>
    [...n.children.values()].flatMap((c) => [
      h(
        "li",
        { class: same(app.view, { kind: "folder", value: c.path }) ? "active" : "", style: `--depth:${depth}` },
        h(
          "button",
          {
            type: "button",
            title: c.path,
            onclick: () => {
              app.setView({ kind: "folder", value: c.path });
              closeMenu();
            },
          },
          h("span", { class: "label" }, c.name),
          c.count ? h("span", { class: "count" }, c.count) : null,
        ),
      ),
      ...folderNode(c, depth + 1),
    ]);

  const live = app.papers.filter((p) => !p.trashed);
  const counts = {
    all: live.length,
    starred: live.filter((p) => p.starred).length,
    recent: live.filter((p) => p.opened).length,
    trash: app.papers.length - live.length,
  };
  const folders = tree(app.folders());
  const tags = app.tags();
  const hasExamples = app.papers.some(isExample);
  const tool = (label: string, fn: () => void, title?: string) =>
    h("li", null, h("button", { type: "button", title, onclick: () => (fn(), closeMenu()) }, h("span", { class: "label" }, label)));
  const folderView = app.view.kind === "folder" ? app.view.value : null;

  replace(
    el,
    h(
      "nav",
      { "aria-label": "Library" },
      h(
        "ul",
        { class: "views" },
        item({ kind: "all" }, "All papers", counts.all),
        item({ kind: "starred" }, "★ Starred", counts.starred),
        item({ kind: "recent" }, "Recently read", counts.recent),
        item({ kind: "trash" }, "Trash", counts.trash),
      ),
      hasExamples
        ? h(
            "div",
            { class: "examples-note" },
            "The two papers tagged Example show how lightkone works. ",
            h("button", { type: "button", class: "link", onclick: () => app.removeExamples() }, "Remove them"),
          )
        : null,
      h("h3", null, "Folders"),
      folders.children.size
        ? h("ul", { class: "folders" }, folderNode(folders, 0))
        : h("p", { class: "hint" }, "Put a paper in a folder from its details, e.g. Physics/QFT."),
      folderView
        ? h("p", { class: "folder-tools" }, h("button", { type: "button", onclick: () => tools.syncBib(folderView) }, "Sync .bib of this folder"))
        : null,
      h("h3", null, "Tags"),
      tags.length
        ? h(
            "ul",
            { class: "tags" },
            tags.slice(0, 60).map(([t, n]) => item({ kind: "tag", value: t }, t, n)),
          )
        : h("p", { class: "hint" }, "No tags yet."),
      h("h3", null, "Discover"),
      h("ul", { class: "tools" }, tool("Add papers", tools.add), tool("Chats", tools.chats, "Ask Claude about papers (needs a Claude key)")),
      h("h3", null, "Write"),
      h("ul", { class: "tools" }, tool("Export .bib of the papers in view", tools.exportBib), tool("Cite the selected paper", tools.cite)),
      h("h3", null, "Organize"),
      h(
        "ul",
        { class: "tools" },
        tool("Tidy up duplicates", tools.tidy),
        tool("Read PDFs for search", tools.readForSearch),
        tool("Settings", tools.settings),
      ),
    ),
  );
}
