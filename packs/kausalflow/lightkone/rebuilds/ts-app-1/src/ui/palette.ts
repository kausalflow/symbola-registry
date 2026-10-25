// The command palette (Ctrl/⌘K), Help (?) and Chats.
import { search } from "../../impl/search-query/src/index.ts";
import type { App } from "../app/app.ts";
import { claude, paperContext, type Message } from "../app/claude.ts";
import type { Paper } from "../core/types.ts";
import { h, markdownToHtml, modal, replace } from "./dom.ts";
import { shortAuthors } from "./list.ts";

export interface Command {
  label: string;
  hint?: string;
  run(): void;
}

export function palette(app: App, commands: Command[], open: (p: Paper) => void) {
  const input = h("input", { type: "text", placeholder: "Type a command or a paper…", "aria-label": "Command" });
  const out = h("ul", { class: "palette", role: "listbox" });
  let items: { label: string; hint?: string; run(): void }[] = [];
  let at = 0;
  const draw = () => {
    const q = input.value.trim().toLowerCase();
    const cmds = commands.filter((c) => !q || c.label.toLowerCase().includes(q));
    const papers = q ? search(app.papers as never, input.value, "relevance").slice(0, 8).map((id) => app.paper(id)!) : [];
    items = [...cmds, ...papers.map((p) => ({ label: p.title, hint: [shortAuthors(p.authors), p.year].filter(Boolean).join(" "), run: () => open(p) }))];
    at = Math.min(at, Math.max(0, items.length - 1));
    replace(
      out,
      items.map((it, i) =>
        h(
          "li",
          { class: i === at ? "on" : "", role: "option", onclick: () => (close(), it.run()) },
          h("span", null, it.label),
          it.hint ? h("span", { class: "small" }, it.hint) : null,
        ),
      ),
    );
  };
  input.addEventListener("input", () => ((at = 0), draw()));
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") (e.preventDefault(), (at = Math.min(items.length - 1, at + 1)), draw());
    if (e.key === "ArrowUp") (e.preventDefault(), (at = Math.max(0, at - 1)), draw());
    if (e.key === "Enter" && items[at]) (e.preventDefault(), close(), items[at].run());
  });
  draw();
  const close = modal("Commands", h("div", null, input, out));
  input.focus();
}

export function helpDialog() {
  const row = (k: string, v: string) => h("tr", null, h("td", null, h("code", null, k)), h("td", null, v));
  modal(
    "Help",
    h(
      "div",
      { class: "help" },
      h("h3", null, "Searching"),
      h("p", null, "Words match the title, authors and the rest of the record, ignoring case and accents. Every word and filter must hold. Quote phrases: \"neural network\"."),
      h(
        "table",
        null,
        row("tag:physics", "papers with that tag (whole tag)"),
        row("author:hinton", "an author's name contains it"),
        row("year:2017 year:2015-2019", "a year, or a range"),
        row('in:"Physics/QFT"', "a folder and the folders inside it"),
        row("has:pdf  no:abstract", "pdf, abstract, arxiv or notes present / missing"),
        row("is:starred  is:recent  is:trash", "starred, opened, or in the trash"),
      ),
      h("p", null, "Once a paper's PDF has been read for search, a paper whose text holds every word shows too, below the record matches."),
      h("h3", null, "Keys"),
      h(
        "table",
        null,
        row("/", "focus the search box"),
        row("Ctrl/⌘ K", "command palette"),
        row("?", "this help"),
        row("Esc", "close the reader or a dialog"),
        row("Ctrl/⌘ + / −", "zoom in the reader"),
      ),
      h("h3", null, "Your files"),
      h("p", null, "The library is lightkone/library.json and lightkone/library.bib in the storage you chose in Settings; PDFs are under papers/All Papers/, filed as Paperpile files them; highlights are in lightkone/annotations/."),
    ),
    { wide: true },
  );
}

/** Chats: ask Claude about the papers in view (their records, and text once read). */
export function chatsDialog(app: App) {
  const ids = app.results().slice(0, 30);
  const papers = ids.map((id) => app.paper(id)!);
  const history: Message[] = [];
  const log = h("div", { class: "chat-log" });
  const input = h("textarea", { rows: 3, placeholder: app.settings.claudeKey ? "Ask about these papers…" : "Add your Claude key in Settings to chat." });
  const send = h("button", { type: "submit", class: "primary", disabled: !app.settings.claudeKey }, "Ask");
  const form = h(
    "form",
    {
      class: "chat",
      onsubmit: async (e: Event) => {
        e.preventDefault();
        const q = input.value.trim();
        if (!q) return;
        input.value = "";
        history.push({ role: "user", content: q });
        log.append(h("div", { class: "msg user" }, q));
        const pending = h("div", { class: "msg assistant" }, "…");
        log.append(pending);
        send.disabled = true;
        try {
          const texts = await Promise.all(papers.slice(0, 8).map((p) => (app.fulltext.has(p.id) ? app.fulltext.get(p.id) : Promise.resolve(null))));
          const context = papers.map((p, i) => `<paper key="${p.key}">\n${paperContext(p, texts[i] ?? null, 15_000)}\n</paper>`).join("\n");
          const answer = await claude(
            app.settings.claudeKey,
            `You help a researcher with the papers in their library. Cite papers by their citation key in square brackets, like [Hinton2012-ip]. Say when the papers do not answer the question.\n\n${context}`,
            history,
            { model: app.settings.pluginSettings["claude.model"], maxTokens: 2000 },
          );
          history.push({ role: "assistant", content: answer });
          pending.innerHTML = markdownToHtml(answer);
        } catch (err) {
          pending.textContent = (err as Error).message;
          history.pop();
        } finally {
          send.disabled = !app.settings.claudeKey;
        }
      },
    },
    h("p", { class: "hint" }, `Asking about the ${papers.length} paper${papers.length === 1 ? "" : "s"} in view${ids.length < app.results().length ? " (the first 30)" : ""}.`),
    log,
    input,
    h("div", { class: "row" }, send),
  );
  modal("Chats: Ask", form, { wide: true });
  input.focus();
}

export async function summarizeDialog(app: App, p: Paper) {
  const out = h("div", { class: "markdown" }, "Asking Claude…");
  modal(`Summary: ${p.title}`, out, { wide: true });
  try {
    const text = app.fulltext.has(p.id) ? await app.fulltext.get(p.id) : null;
    const answer = await claude(
      app.settings.claudeKey,
      "Summarize research papers for a researcher: the question, the method, the main results with numbers, and the limits. Use short sections.",
      [{ role: "user", content: paperContext(p, text) }],
      { model: app.settings.pluginSettings["claude.model"], maxTokens: 1500 },
    );
    out.innerHTML = markdownToHtml(answer);
  } catch (e) {
    out.textContent = (e as Error).message;
  }
}
