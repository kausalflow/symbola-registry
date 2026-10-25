// Paper details: the record, its citation key (tap to copy), folders and tags
// to edit, star, notes, Read, Get free PDF, Attach / Replace PDF, Cite, trash
// or restore, and plugin actions.
import type { App } from "../app/app.ts";
import { pdfPaths } from "../app/files.ts";
import { attachPdf, fetchFreePdf, isPdf } from "../core/add.ts";
import type { Paper } from "../core/types.ts";
import { copy, h, iconButton, replace, toast } from "./dom.ts";

export interface DetailActions {
  read(p: Paper): void;
  cite(p: Paper): void;
  close(): void;
  summarize(p: Paper): void;
}

function chipEditor(label: string, values: string[], suggestions: string[], onChange: (next: string[]) => void, placeholder: string) {
  const listId = `dl-${label.toLowerCase()}`;
  const input = h("input", {
    type: "text",
    placeholder,
    list: listId,
    "aria-label": `Add ${label.toLowerCase()}`,
    onkeydown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        commit();
      }
    },
    onchange: () => commit(),
  });
  const commit = () => {
    const v = input.value.trim().replace(/^\/+|\/+$/g, "");
    input.value = "";
    if (v && !values.includes(v)) onChange([...values, v]);
  };
  return h(
    "div",
    { class: "field" },
    h("label", null, label),
    h(
      "div",
      { class: "chips editable" },
      values.map((v) => h("span", { class: "chip" }, v, iconButton(`Remove ${v}`, "×", () => onChange(values.filter((x) => x !== v)), "chip-x"))),
      input,
    ),
    h(
      "datalist",
      { id: listId },
      suggestions.filter((s) => !values.includes(s)).map((s) => h("option", { value: s })),
    ),
  );
}

const EDITABLE: [keyof Paper, string][] = [
  ["title", "Title"],
  ["type", "Type"],
  ["year", "Year"],
  ["venue", "Venue"],
  ["doi", "DOI"],
  ["arxiv", "arXiv"],
  ["url", "URL"],
  ["abstract", "Abstract"],
];

function editForm(app: App, p: Paper, done: () => void) {
  const inputs = new Map<string, HTMLInputElement | HTMLTextAreaElement>();
  const authors = h("textarea", { rows: 3 }, p.authors.join("\n"));
  const form = h(
    "form",
    {
      class: "edit",
      onsubmit: (e: Event) => {
        e.preventDefault();
        app.edit(() => {
          for (const [k, el] of inputs) {
            const v = el.value.trim();
            if (k === "year") {
              if (/^\d+$/.test(v)) p.year = Number(v);
              else delete p.year;
            } else if (k === "title") {
              if (v) p.title = v;
            } else if (k === "type") p.type = v.toLowerCase() || "article";
            else if (v) (p as Record<string, unknown>)[k] = v;
            else delete (p as Record<string, unknown>)[k];
          }
          p.authors = authors.value.split("\n").map((a) => a.trim()).filter(Boolean);
        });
        done();
      },
    },
    EDITABLE.map(([k, label]) => {
      const value = p[k] === undefined ? "" : String(p[k]);
      const el = k === "abstract" ? h("textarea", { rows: 5 }, value) : h("input", { type: "text", value });
      inputs.set(k as string, el);
      return h("label", { class: "field" }, h("span", null, label), el);
    }),
    h("label", { class: "field" }, h("span", null, "Authors, one per line (Last, First)"), authors),
    h("div", { class: "row" }, h("button", { class: "primary", type: "submit" }, "Save"), h("button", { type: "button", onclick: done }, "Cancel")),
  );
  return form;
}

export function details(app: App, el: HTMLElement, actions: DetailActions) {
  let editing = false;
  let lastId: string | null = null;
  return function draw() {
    const p = app.paper(app.selected);
    el.classList.toggle("open", Boolean(p));
    if (!p) {
      replace(el, h("p", { class: "empty" }, "Select a paper to see its details."));
      lastId = null;
      return;
    }
    if (p.id !== lastId) editing = false;
    lastId = p.id;
    // Keep the notes box while it is being typed in.
    const notesBox = el.querySelector<HTMLTextAreaElement>("textarea.notes");
    if (notesBox && document.activeElement === notesBox && notesBox.dataset.id === p.id) return;

    const hasPdf = pdfPaths(p).length > 0;
    const fileInput = h("input", {
      type: "file",
      accept: "application/pdf,.pdf",
      hidden: true,
      onchange: async () => {
        const f = fileInput.files?.[0];
        if (!f) return;
        const bytes = new Uint8Array(await f.arrayBuffer());
        if (!isPdf(bytes)) return toast("That file is not a PDF.");
        if (app.store.readOnly) return toast("This library is read-only.");
        await attachPdf(app.store, p, bytes);
        app.changed();
        toast("PDF attached.");
      },
    });
    const notes = h("textarea", {
      class: "notes",
      rows: 5,
      placeholder: "Notes on the whole paper",
      dataset: { id: p.id },
      onchange: () =>
        app.edit(() => {
          const v = notes.value;
          if (v.trim()) p.notes = v;
          else delete p.notes;
        }),
    });
    notes.value = p.notes ?? "";
    const allFolders = [...app.folders().keys()];
    const allTags = app.tags().map(([t]) => t);
    const pluginActions = app.plugins.actions.filter((a) => !a.when || a.when(p));

    replace(
      el,
      h(
        "div",
        { class: "details-head" },
        iconButton("Close details", "←", actions.close, "back"),
        h(
          "button",
          {
            type: "button",
            class: `star${p.starred ? " on" : ""}`,
            title: p.starred ? "Unstar" : "Star",
            onclick: () =>
              app.edit(() => {
                if (p.starred) delete p.starred;
                else p.starred = true;
              }),
          },
          p.starred ? "★" : "☆",
        ),
        h(
          "button",
          {
            type: "button",
            class: "key",
            title: "Copy the citation key",
            onclick: async () => {
              await copy(p.key);
              toast(`Copied ${p.key}`);
            },
          },
          p.key,
        ),
      ),
      editing
        ? editForm(app, p, () => {
            editing = false;
            draw();
          })
        : [
            h("h2", { class: "paper-title" }, p.title),
            p.authors.length ? h("p", { class: "authors" }, p.authors.join("; ")) : null,
            h(
              "p",
              { class: "meta" },
              [p.year, p.venue, p.type].filter(Boolean).join(" · "),
            ),
            h(
              "p",
              { class: "links" },
              p.doi ? h("a", { href: `https://doi.org/${p.doi}`, target: "_blank", rel: "noopener" }, `doi:${p.doi}`) : null,
              p.arxiv ? h("a", { href: `https://arxiv.org/abs/${p.arxiv}`, target: "_blank", rel: "noopener" }, `arXiv:${p.arxiv}`) : null,
              p.url && !p.doi && !p.arxiv ? h("a", { href: p.url, target: "_blank", rel: "noopener" }, new URL(p.url, location.href).host) : null,
            ),
          ],
      h(
        "div",
        { class: "actions" },
        hasPdf || p.markdown || p.html ? h("button", { type: "button", class: "primary", onclick: () => actions.read(p) }, "Read") : null,
        !hasPdf && !p.html
          ? h(
              "button",
              {
                type: "button",
                onclick: async (e: Event) => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.disabled = true;
                  b.textContent = "Looking…";
                  const ok = await fetchFreePdf(app.env, p).catch(() => false);
                  if (ok) {
                    app.changed();
                    toast("Found a free PDF.");
                  } else {
                    toast(app.settings.email ? "No free PDF found." : "No free PDF found. Set a contact email in Settings to ask Unpaywall too.");
                    b.disabled = false;
                    b.textContent = "Get free PDF";
                  }
                },
              },
              "Get free PDF",
            )
          : null,
        h("button", { type: "button", onclick: () => fileInput.click() }, hasPdf ? "Replace PDF" : "Attach PDF"),
        fileInput,
        h("button", { type: "button", onclick: () => actions.cite(p) }, "Cite"),
        app.settings.claudeKey ? h("button", { type: "button", onclick: () => actions.summarize(p) }, "Summarize") : null,
        h(
          "button",
          {
            type: "button",
            onclick: () => {
              editing = !editing;
              draw();
            },
          },
          editing ? "Done" : "Edit",
        ),
        p.trashed
          ? h("button", { type: "button", onclick: () => app.restore(p) }, "Restore")
          : h("button", { type: "button", class: "danger", onclick: () => app.trash(p) }, "Move to trash"),
        pluginActions.map((a) =>
          h(
            "button",
            {
              type: "button",
              onclick: async () => {
                try {
                  await a.run(p, { store: app.store, save: () => app.changed(), toast, settings: app.settings.pluginSettings });
                } catch (e) {
                  toast(`${a.label}: ${(e as Error).message}`);
                }
              },
            },
            a.label,
          ),
        ),
      ),
      chipEditor("Folders", p.folders ?? [], allFolders, (next) => app.edit(() => (p.folders = next)), "Add a folder, e.g. Physics/QFT"),
      chipEditor("Tags", p.tags, allTags, (next) => app.edit(() => (p.tags = next)), "Add a tag"),
      h("div", { class: "field" }, h("label", null, "Notes"), notes),
      p.abstract && !editing ? h("div", { class: "abstract" }, h("h3", null, "Abstract"), h("p", null, p.abstract)) : null,
      Object.keys(p.fields).length && !editing
        ? h(
            "details",
            { class: "fields" },
            h("summary", null, "Other BibTeX fields"),
            h("dl", null, Object.entries(p.fields).map(([k, v]) => [h("dt", null, k), h("dd", null, v)])),
          )
        : null,
      h(
        "p",
        { class: "small" },
        `Added ${new Date(p.added).toLocaleDateString()}`,
        p.opened ? ` · last read ${new Date(p.opened).toLocaleDateString()}` : "",
        p.trashed ? ` · in the trash since ${new Date(p.trashed).toLocaleDateString()}` : "",
      ),
    );
  };
}
