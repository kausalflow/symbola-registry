// The paper list: search-query's results, each row with title, authors,
// year, venue, tags, a star, and an Offline label when kept on the device.
import type { App } from "../app/app.ts";
import { viewLabel } from "../app/app.ts";
import { pdfPaths } from "../app/files.ts";
import type { Paper } from "../core/types.ts";
import { h, replace } from "./dom.ts";

const PAGE = 200;

export function shortAuthors(authors: string[]): string {
  const names = authors.map((a) => (a.includes(",") ? a.slice(0, a.indexOf(",")) : a).replace(/^\{|\}$/g, "").trim());
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]} et al.`;
}

export function list(app: App, el: HTMLElement, opts: { open(p: Paper): void; read(p: Paper): void; readForSearch(): void }) {
  let shown = PAGE;
  const draw = () => {
    const ids = app.results();
    const unread = app.unreadForSearch().length;
    const rows = ids.slice(0, shown).map((id) => row(app.paper(id)!));
    replace(
      el,
      h(
        "div",
        { class: "list-head" },
        h("h2", null, viewLabel(app.view)),
        h("span", { class: "count" }, `${ids.length} paper${ids.length === 1 ? "" : "s"}`),
        app.view.kind === "trash" && ids.length
          ? h(
              "button",
              {
                type: "button",
                class: "danger",
                onclick: () => {
                  if (confirm(`Delete ${ids.length} papers in the trash for good? Their PDFs and highlights go too.`)) app.emptyTrash();
                },
              },
              "Empty trash",
            )
          : null,
      ),
      unread && app.fulltext.ready
        ? h(
            "p",
            { class: "fulltext-note" },
            `${unread} paper${unread === 1 ? "'s PDF has" : "s' PDFs have"} not been read for search yet. `,
            h("button", { type: "button", class: "link", onclick: opts.readForSearch }, "Read them"),
          )
        : null,
      ids.length
        ? h("ul", { class: "papers", role: "list" }, rows)
        : h("p", { class: "empty" }, app.papers.length ? "No papers match." : "No papers yet. Press Add paper, or drop PDFs or a .bib file here."),
      ids.length > shown
        ? h(
            "button",
            {
              type: "button",
              class: "more",
              onclick: () => {
                shown += PAGE;
                draw();
              },
            },
            `Show more (${ids.length - shown} left)`,
          )
        : null,
    );
  };

  const row = (p: Paper) => {
    const kept = app.offline && pdfPaths(p).some((x) => app.offline!.isKept(x));
    return h(
      "li",
      {
        class: `paper${app.selected === p.id ? " selected" : ""}`,
        dataset: { id: p.id },
        tabindex: 0,
        onclick: () => opts.open(p),
        ondblclick: () => opts.read(p),
        onkeydown: (e: KeyboardEvent) => {
          if (e.key === "Enter") opts.open(p);
        },
      },
      h(
        "button",
        {
          type: "button",
          class: `star${p.starred ? " on" : ""}`,
          title: p.starred ? "Unstar" : "Star",
          "aria-pressed": p.starred ? "true" : "false",
          onclick: (e: Event) => {
            e.stopPropagation();
            app.edit(() => {
              if (p.starred) delete p.starred;
              else p.starred = true;
            });
          },
        },
        p.starred ? "★" : "☆",
      ),
      h(
        "div",
        { class: "paper-main" },
        h("div", { class: "title" }, p.title),
        h(
          "div",
          { class: "meta" },
          [shortAuthors(p.authors), p.year, p.venue].filter(Boolean).join(" · "),
          p.pdf || p.file ? h("span", { class: "badge" }, "PDF") : null,
          p.html ? h("span", { class: "badge" }, "Page") : null,
          kept ? h("span", { class: "badge offline" }, "Offline") : null,
        ),
        p.tags.length ? h("div", { class: "chips" }, p.tags.map((t) => h("span", { class: "chip" }, t))) : null,
      ),
    );
  };

  return {
    draw,
    reset() {
      shown = PAGE;
    },
  };
}
