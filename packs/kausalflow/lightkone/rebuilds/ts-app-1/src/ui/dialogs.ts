// Add paper, Cite, Tidy up, Sync .bib, and reading PDFs for search.
import { findDuplicates, type Group } from "../../impl/tidy/src/index.ts";
import type { App } from "../app/app.ts";
import { readForSearch } from "../app/files.ts";
import { addPdf, addText, type AddReport } from "../core/add.ts";
import { CITE_FORMATS, cite, type CiteFormat } from "../core/cite.ts";
import { publishedVersion } from "../core/lookups.ts";
import type { Draft, Paper } from "../core/types.ts";
import { copy, h, modal, replace, toast } from "./dom.ts";
import { shortAuthors } from "./list.ts";

// ── Add paper (flows 3, 4, 5) ──────────────────────────────────────────

function reportView(r: AddReport, open: (p: Paper) => void) {
  const item = (p: Paper) => h("li", null, h("button", { type: "button", class: "link", onclick: () => open(p) }, p.title), h("span", { class: "small" }, ` ${p.key}`));
  return h(
    "div",
    { class: "report" },
    r.added.length ? [h("h3", null, `Added ${r.added.length}`), h("ul", null, r.added.slice(0, 50).map(item))] : null,
    r.existing.length ? [h("h3", null, `Already in the library: ${r.existing.length}`), h("ul", null, r.existing.slice(0, 50).map(item))] : null,
    r.failed.length ? [h("h3", null, `Not added: ${r.failed.length}`), h("ul", { class: "failed" }, r.failed.map((f) => h("li", null, h("code", null, f.line.slice(0, 80)), ` — ${f.error}`)))] : null,
    !r.added.length && !r.existing.length && !r.failed.length ? h("p", null, "Nothing to add.") : null,
  );
}

export async function addFiles(app: App, files: File[], open: (p: Paper) => void, out?: HTMLElement) {
  if (app.store.readOnly) return toast("This library is read-only.");
  const total: AddReport = { added: [], existing: [], failed: [] };
  for (const f of files) {
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const isBib = /\.(bib|bibtex|txt)$/i.test(f.name) || f.type.includes("bibtex");
      const r = isBib
        ? await addText({ ...app.env, fetchPdfs: false }, new TextDecoder().decode(bytes))
        : await addPdf(app.env, f.name, bytes);
      total.added.push(...r.added);
      total.existing.push(...r.existing.filter((p) => !total.existing.includes(p)));
      total.failed.push(...r.failed.map((x) => ({ ...x, line: `${f.name}: ${x.line}` })));
    } catch (e) {
      total.failed.push({ line: f.name, error: (e as Error).message });
    }
  }
  app.changed();
  if (out) replace(out, reportView(total, open));
  else toast(`Added ${total.added.length}, already there ${total.existing.length}${total.failed.length ? `, not added ${total.failed.length}` : ""}.`, 6000);
}

export function addDialog(app: App, open: (p: Paper) => void, prefill = "") {
  const text = h("textarea", {
    rows: 8,
    placeholder: "One per line: arXiv ids or links, DOIs or doi.org links, publisher pages, other web pages — or paste BibTeX.",
    "aria-label": "Papers to add",
  });
  text.value = prefill;
  const tags = h("input", { type: "text", placeholder: "Tags for these papers (comma-separated, optional)" });
  const folder = h("input", { type: "text", placeholder: "Folder (optional), e.g. Physics/QFT", list: "add-folders" });
  const out = h("div", { class: "add-out" });
  const files = h("input", {
    type: "file",
    multiple: true,
    accept: ".pdf,.bib,.bibtex,application/pdf,application/x-bibtex,text/plain",
    hidden: true,
    onchange: () => addFiles(app, [...(files.files ?? [])], (p) => (close(), open(p)), out),
  });
  const go = h(
    "button",
    {
      class: "primary",
      type: "submit",
    },
    "Add",
  );
  const form = h(
    "form",
    {
      class: "add-form",
      onsubmit: async (e: Event) => {
        e.preventDefault();
        if (app.store.readOnly) return toast("This library is read-only.");
        if (!text.value.trim()) return;
        go.disabled = true;
        replace(out, h("p", { class: "loading" }, "Adding…"));
        try {
          const extra = tags.value.split(/[,;]/).map((t) => t.trim()).filter(Boolean);
          const r = await addText({ ...app.env, onProgress: (m) => replace(out, h("p", { class: "loading" }, m)) }, text.value, extra, folder.value.trim().replace(/^\/+|\/+$/g, "") || undefined);
          app.changed();
          replace(out, reportView(r, (p) => (close(), open(p))));
          if (!r.failed.length) text.value = "";
        } catch (err) {
          replace(out, h("p", { class: "error" }, (err as Error).message));
        } finally {
          go.disabled = false;
        }
      },
    },
    text,
    h("div", { class: "row" }, tags, folder),
    h("datalist", { id: "add-folders" }, [...app.folders().keys()].map((f) => h("option", { value: f }))),
    h("div", { class: "row" }, go, h("button", { type: "button", onclick: () => files.click() }, "Add files (.pdf, .bib)"), files),
    h("p", { class: "hint" }, "You can also drop PDFs or a .bib file anywhere on the app. A paper already in the library is not added twice: it gains what it lacked."),
    out,
  );
  const close = modal("Add paper", form, { wide: true });
  text.focus();
}

// ── Cite (flow 10) ─────────────────────────────────────────────────────

export function citeDialog(p: Paper) {
  let format: CiteFormat = (localStorage.getItem("lightkone.citeFormat") as CiteFormat) || "latex";
  const pre = h("pre", { class: "cite-out" });
  const tabs = h("div", { class: "seg wrap" });
  const draw = () => {
    pre.textContent = cite(p, format);
    replace(
      tabs,
      CITE_FORMATS.map((f) =>
        h(
          "button",
          {
            type: "button",
            class: f.id === format ? "on" : "",
            onclick: () => {
              format = f.id;
              localStorage.setItem("lightkone.citeFormat", format);
              draw();
            },
          },
          f.label,
        ),
      ),
    );
  };
  draw();
  modal(
    `Cite ${p.key}`,
    h(
      "div",
      null,
      tabs,
      pre,
      h(
        "div",
        { class: "row" },
        h(
          "button",
          {
            type: "button",
            class: "primary",
            onclick: async () => {
              await copy(pre.textContent ?? "");
              toast("Copied.");
            },
          },
          "Copy",
        ),
      ),
    ),
    { wide: true },
  );
}

// ── Tidy up (flow 9) ───────────────────────────────────────────────────

/** Applies tidy's patch to the keeper and moves the others to the trash. */
export function mergeGroup(app: App, g: Group) {
  const keeper = app.paper(g.keep);
  if (!keeper) return;
  for (const [k, v] of Object.entries(g.patch)) {
    if (v === null || v === undefined) continue;
    (keeper as Record<string, unknown>)[k] = v;
  }
  const now = new Date().toISOString();
  for (const id of g.ids) {
    if (id === g.keep) continue;
    const other = app.paper(id);
    if (other) other.trashed = now;
  }
}

export function tidyDialog(app: App, open: (p: Paper) => void) {
  const body = h("div", { class: "tidy" });
  let close = () => {};
  const draw = () => {
    const groups = findDuplicates(app.papers as never);
    const preprints = app.papers.filter((p) => !p.trashed && p.arxiv && (!p.doi || p.doi.toLowerCase().startsWith("10.48550/")));
    const paperLine = (id: string, keep: boolean) => {
      const p = app.paper(id)!;
      return h(
        "li",
        { class: keep ? "keep" : "" },
        h("button", { type: "button", class: "link", onclick: () => (close(), open(p)) }, p.title),
        h("span", { class: "small" }, ` ${[shortAuthors(p.authors), p.year, p.pdf || p.file ? "PDF" : "", p.notes ? "notes" : ""].filter(Boolean).join(" · ")}`),
        keep ? h("strong", { class: "small" }, " — kept") : null,
      );
    };
    replace(
      body,
      h("h3", null, groups.length ? `${groups.length} group${groups.length === 1 ? "" : "s"} of duplicates` : "No duplicates"),
      groups.length
        ? h(
            "div",
            { class: "row" },
            h(
              "button",
              {
                type: "button",
                class: "primary",
                onclick: () => {
                  app.edit(() => groups.forEach((g) => mergeGroup(app, g)));
                  toast(`Merged ${groups.length} groups; the others are in the trash.`);
                  draw();
                },
              },
              "Merge all",
            ),
          )
        : null,
      groups.map((g) =>
        h(
          "div",
          { class: "group" },
          h("ul", null, g.ids.map((id) => paperLine(id, id === g.keep))),
          h(
            "p",
            { class: "small" },
            "The kept paper gains: ",
            [
              g.patch.tags.length ? `tags ${g.patch.tags.join(", ")}` : "",
              g.patch.folders.length ? `folders ${g.patch.folders.join(", ")}` : "",
              ...(["doi", "arxiv", "venue", "year", "abstract", "url", "pdf", "file", "notes", "starred"] as const).filter((k) => g.patch[k] !== null && g.patch[k] !== undefined && app.paper(g.keep)?.[k] !== g.patch[k]),
            ]
              .filter(Boolean)
              .join("; ") || "nothing new",
          ),
          h(
            "button",
            {
              type: "button",
              onclick: () => {
                app.edit(() => mergeGroup(app, g));
                draw();
              },
            },
            "Merge",
          ),
        ),
      ),
      h("h3", null, "Published versions of arXiv preprints"),
      preprints.length
        ? [
            h("p", { class: "hint" }, `${preprints.length} preprint${preprints.length === 1 ? "" : "s"} without a journal DOI. Look up their published versions (journal, DOI, volume, pages); keys stay as they are.`),
            h(
              "button",
              {
                type: "button",
                onclick: async (e: Event) => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.disabled = true;
                  const found: { p: Paper; d: Draft }[] = [];
                  let i = 0;
                  for (const p of preprints) {
                    b.textContent = `Looking… ${++i}/${preprints.length}`;
                    const d = await publishedVersion(p.arxiv!, app.env.ctx).catch(() => null);
                    if (d) found.push({ p, d });
                  }
                  b.remove();
                  replace(
                    offers,
                    found.length
                      ? found.map(({ p, d }) =>
                          h(
                            "div",
                            { class: "group" },
                            h("p", null, h("strong", null, p.title)),
                            h("p", { class: "small" }, `${d.venue ?? ""} ${d.fields?.volume ? "vol. " + d.fields.volume : ""} ${d.fields?.pages ?? ""} · doi:${d.doi}`),
                            h(
                              "button",
                              {
                                type: "button",
                                onclick: (ev: Event) => {
                                  app.edit(() => {
                                    if (d.doi) p.doi = d.doi;
                                    if (d.venue) p.venue = d.venue;
                                    if (d.year) p.year = d.year;
                                    if (d.type) p.type = d.type;
                                    p.fields = { ...p.fields, ...(d.fields ?? {}) };
                                  });
                                  (ev.currentTarget as HTMLButtonElement).replaceWith(h("span", { class: "small" }, "Updated."));
                                },
                              },
                              "Use the published version",
                            ),
                          ),
                        )
                      : h("p", null, "None of them has a published version yet."),
                  );
                },
              },
              "Find published versions",
            ),
          ]
        : h("p", { class: "hint" }, "Every arXiv paper already has its published DOI."),
      offers,
    );
  };
  const offers = h("div");
  draw();
  close = modal("Tidy up", body, { wide: true });
}

// ── Sync .bib (flow 11) ────────────────────────────────────────────────

export function bibSyncDialog(app: App, folder: string) {
  const existing = (app.store.data.bibSync ?? []).filter((t) => t.folder === folder);
  const repo = h("input", { type: "text", placeholder: "owner/name", value: existing[0]?.repo ?? "" });
  const path = h("input", { type: "text", placeholder: "e.g. references.bib", value: existing[0]?.path ?? `${folder.replace(/\//g, "-")}.bib` });
  const branch = h("input", { type: "text", placeholder: "default branch", value: existing[0]?.branch ?? "" });
  const form = h(
    "form",
    {
      onsubmit: (e: Event) => {
        e.preventDefault();
        if (!/^[\w.-]+\/[\w.-]+$/.test(repo.value.trim())) return toast("Repository is owner/name.");
        if (!app.settings.bibSyncToken) toast("Add a BibTeX sync token in Settings: until then nothing is written.", 6000);
        app.edit(() => {
          const others = (app.store.data.bibSync ?? []).filter((t) => t.folder !== folder);
          const target = { folder, repo: repo.value.trim(), path: path.value.trim().replace(/^\/+/, ""), ...(branch.value.trim() ? { branch: branch.value.trim() } : {}) };
          app.store.data.bibSync = [...others, target];
        });
        close();
        toast(`From now on ${folder}'s .bib is written to ${repo.value.trim()}/${path.value.trim()} whenever its papers change.`, 6000);
      },
    },
    h("p", null, `Keep the .bib of ${folder} (and the folders inside it) in a GitHub repository, e.g. the one your Overleaf project syncs with. lightkone commits the file whenever the folder's papers change.`),
    h("label", { class: "field" }, h("span", null, "Repository"), repo),
    h("label", { class: "field" }, h("span", null, "Path in the repository"), path),
    h("label", { class: "field" }, h("span", null, "Branch"), branch),
    h(
      "div",
      { class: "row" },
      h("button", { class: "primary", type: "submit" }, existing.length ? "Update" : "Sync .bib"),
      existing.length
        ? h(
            "button",
            {
              type: "button",
              class: "danger",
              onclick: () => {
                app.edit(() => {
                  const rest = (app.store.data.bibSync ?? []).filter((t) => t.folder !== folder);
                  if (rest.length) app.store.data.bibSync = rest;
                  else delete app.store.data.bibSync;
                });
                close();
              },
            },
            "Stop syncing",
          )
        : null,
    ),
  );
  const close = modal(`Sync .bib: ${folder}`, form);
}

// ── Read PDFs for search (flow 6) ──────────────────────────────────────

export async function readPdfsForSearch(app: App, onlyInView: boolean) {
  const papers = onlyInView ? app.unreadForSearch() : app.fulltext.unread(app.papers);
  if (!papers.length) return toast("Every PDF has been read for search.");
  const status = h("p", null, `Reading 0 of ${papers.length}…`);
  const close = modal("Reading PDFs for search", status);
  const n = await readForSearch(app, papers, (done, total) => (status.textContent = `Reading ${done} of ${total}…`));
  close();
  toast(`Read ${n} PDF${n === 1 ? "" : "s"} for search.`);
  app.render();
}
