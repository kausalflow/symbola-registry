// Settings: where the library lives, PDFs, Claude key, BibTeX sync token,
// plugins by URL, MCP address, and Backup. Everything here stays in this
// browser's localStorage.
import type { App } from "../app/app.ts";
import { DEFAULT_MODEL } from "../app/claude.ts";
import { sealForSite } from "../core/mcp-address.ts";
import { exportBackup, importBackup } from "../core/settings.ts";
import { copy, download, h, modal, replace, toast } from "./dom.ts";

export function bookmarklet(): string {
  const origin = location.origin;
  return `javascript:(()=>{window.open('${origin}/app/?add='+encodeURIComponent(location.href),'lightkone')})()`;
}

export function settingsDialog(app: App) {
  const s = app.settings;
  let close = () => {};

  // ── Where your library lives ──
  const providers = app.plugins.storage;
  const providerSelect = h(
    "select",
    { "aria-label": "Storage", onchange: () => drawFields() },
    providers.map((p) => h("option", { value: p.id, selected: p.id === s.storage }, p.label)),
  );
  const fieldsBox = h("div", { class: "fields-box" });
  const inputs = new Map<string, HTMLInputElement>();
  const drawFields = () => {
    const p = providers.find((x) => x.id === providerSelect.value)!;
    inputs.clear();
    replace(
      fieldsBox,
      p.fields.map((f) => {
        const input = h("input", {
          type: f.type === "password" ? "password" : "text",
          placeholder: f.placeholder ?? (f.optional ? "optional" : ""),
          value: providerSelect.value === s.storage ? (s.storageConfig[f.key] ?? "") : "",
          autocomplete: "off",
        });
        inputs.set(f.key, input);
        return h("label", { class: "field" }, h("span", null, f.label + (f.optional ? " (optional)" : "")), input, f.help ? h("small", null, f.help) : null);
      }),
      p.id === "s3" ? h("p", { class: "hint" }, "The bucket needs a CORS rule that allows this site's origin to GET, PUT, DELETE and HEAD, with the headers authorization, content-type, x-amz-date and x-amz-content-sha256.") : null,
      p.id === "browser" ? h("p", { class: "hint" }, "The library stays in this browser (IndexedDB). Choose a bucket or GitHub to have it on several devices; lightkone offers to copy it there.") : null,
    );
  };
  drawFields();
  const saveStorage = h(
    "button",
    {
      type: "button",
      class: "primary",
      onclick: async () => {
        const p = providers.find((x) => x.id === providerSelect.value)!;
        const config: Record<string, string> = {};
        for (const [k, el] of inputs) if (el.value.trim()) config[k] = el.value.trim();
        const missing = p.fields.filter((f) => !f.optional && !config[f.key]);
        if (missing.length) return toast(`Fill in ${missing.map((f) => f.label).join(", ")}.`);
        if (app.saveState === "saving" || app.store.dirty) await app.saveNow();
        // Moving to an empty storage: offer to bring the library and its files along.
        let target;
        try {
          target = p.create(config);
        } catch (e) {
          return toast((e as Error).message);
        }
        const from = app.storage;
        const hasPapers = app.papers.length > 0 && !app.openError;
        if (hasPapers && p.id !== s.storage) {
          const there = await target.read("lightkone/library.json").catch(() => undefined);
          if (there === null && confirm(`The new storage has no library yet. Copy your ${app.papers.length} papers and their files there?`)) {
            const paths = await from.list("").catch(() => [] as string[]);
            let n = 0;
            for (const path of paths) {
              const bytes = await from.read(path).catch(() => null);
              if (!bytes) continue;
              saveStorage.textContent = `Copying ${++n} of ${paths.length}…`;
              await target.write(path, bytes, path.endsWith(".json") ? "application/json" : path.endsWith(".pdf") ? "application/pdf" : "application/octet-stream");
            }
          }
        }
        app.updateSettings({ storage: p.id, storageConfig: config, mcpAddress: "" });
        close();
        await app.open();
        toast(app.openError ? `Could not open: ${app.openError}` : `Opened ${app.storage.label}.`, 6000);
      },
    },
    "Save and open",
  );

  // ── Other settings ──
  const text = (value: string, placeholder = "", type = "text") => h("input", { type, value, placeholder, autocomplete: "off" });
  const email = text(s.email, "you@university.edu", "email");
  const claudeKey = text(s.claudeKey, "sk-ant-…", "password");
  const model = text(s.pluginSettings["claude.model"] ?? "", DEFAULT_MODEL);
  const bibToken = text(s.bibSyncToken, "github_pat_…", "password");
  const pluginList = h("ul", { class: "plugins" });
  let plugins = [...s.plugins];
  const drawPlugins = () =>
    replace(
      pluginList,
      plugins.map((url) =>
        h(
          "li",
          null,
          h("code", null, url),
          ` ${app.plugins.names.find((n) => n.url === url)?.name ?? ""}`,
          app.plugins.errors.find((e) => e.url === url) ? h("span", { class: "error" }, " did not load") : null,
          h("button", { type: "button", class: "link", onclick: () => ((plugins = plugins.filter((u) => u !== url)), drawPlugins()) }, "Remove"),
        ),
      ),
    );
  drawPlugins();
  const pluginUrl = text("", "https://…/plugin.js", "url");
  const pluginFields = app.plugins.settings.map((f) => {
    const el = text(s.pluginSettings[f.key] ?? "", f.placeholder ?? "", f.type === "password" ? "password" : "text");
    return { f, el };
  });

  const saveOthers = h(
    "button",
    {
      type: "button",
      class: "primary",
      onclick: () => {
        const pluginSettings = { ...s.pluginSettings };
        for (const { f, el } of pluginFields) pluginSettings[f.key] = el.value.trim();
        if (model.value.trim()) pluginSettings["claude.model"] = model.value.trim();
        else delete pluginSettings["claude.model"];
        const pluginsChanged = plugins.join("\n") !== s.plugins.join("\n");
        app.updateSettings({ email: email.value.trim(), claudeKey: claudeKey.value.trim(), bibSyncToken: bibToken.value.trim(), plugins, pluginSettings });
        toast(pluginsChanged ? "Saved. Reloading to load the plugins…" : "Saved.");
        if (pluginsChanged) setTimeout(() => location.reload(), 600);
        app.render();
      },
    },
    "Save settings",
  );

  // ── MCP address (flow 13) ──
  const provider = providers.find((p) => p.id === s.storage);
  const mcpOut = h("div", { class: "mcp" }, s.mcpAddress ? mcpView(s.mcpAddress) : null);
  function mcpView(addr: string) {
    return h(
      "div",
      null,
      h("code", { class: "address" }, addr),
      h("button", { type: "button", onclick: async () => (await copy(addr), toast("Copied the MCP address.")) }, "Copy"),
      h("p", { class: "hint" }, "Add it to your AI app as a remote MCP server (Claude: Settings → Connectors → Add custom connector). Anyone with this address can read and change your library: keep it like a password. Changing storage makes a new one."),
    );
  }
  const makeMcp = h(
    "button",
    {
      type: "button",
      disabled: !provider?.remote,
      onclick: async () => {
        try {
          const res = await fetch("/api/mcp-key");
          if (!res.ok) throw new Error("This site has no MCP key set up.");
          const jwk = (await res.json()) as JsonWebKey;
          const token = await sealForSite({ storage: s.storage, config: s.storageConfig, email: s.email || undefined }, jwk);
          const addr = `${location.origin}/mcp/${token}`;
          app.updateSettings({ mcpAddress: addr });
          replace(mcpOut, mcpView(addr));
        } catch (e) {
          toast((e as Error).message);
        }
      },
    },
    "Make my AI app address",
  );

  // ── Backup ──
  const pass = text("", "Passphrase (recommended)", "password");
  const importFile = h("input", {
    type: "file",
    accept: ".json,application/json",
    hidden: true,
    onchange: async () => {
      const f = importFile.files?.[0];
      if (!f) return;
      try {
        const restored = await importBackup(await f.text(), pass.value);
        app.updateSettings(restored);
        close();
        toast("Settings restored. Opening the library…");
        setTimeout(() => location.reload(), 500);
      } catch (e) {
        toast((e as Error).message);
      }
    },
  });

  const downloadLibrary = h(
    "button",
    {
      type: "button",
      onclick: async () => {
        const bytes = await app.storage.read("lightkone/library.json").catch(() => null);
        if (!bytes) return toast("There is no library.json yet.");
        download("library.json", bytes, "application/json");
      },
    },
    "Download library.json",
  );
  const body = h(
    "div",
    { class: "settings" },
    h(
      "section",
      null,
      h("h3", null, "Where your library lives"),
      providerSelect,
      fieldsBox,
      h("div", { class: "row" }, saveStorage, downloadLibrary),
      app.openError ? h("p", { class: "error" }, app.openError) : null,
    ),
    h(
      "section",
      null,
      h("h3", null, "PDFs"),
      h("label", { class: "field" }, h("span", null, "Contact email for open-access copies"), email, h("small", null, "Unpaywall asks for one; it finds free PDFs of papers with a DOI.")),
    ),
    h(
      "section",
      null,
      h("h3", null, "Claude"),
      h("label", { class: "field" }, h("span", null, "Claude key"), claudeKey, h("small", null, "For Explain, Summarize and Chats. Calls go from this browser straight to Anthropic.")),
      h("label", { class: "field" }, h("span", null, "Model"), model),
    ),
    h(
      "section",
      null,
      h("h3", null, "BibTeX sync"),
      h("label", { class: "field" }, h("span", null, "GitHub token for synced .bib files"), bibToken, h("small", null, "Fine-grained, Contents: read and write, for the repositories your manuscripts live in.")),
    ),
    h(
      "section",
      null,
      h("h3", null, "Plugins"),
      pluginList,
      h(
        "div",
        { class: "row" },
        pluginUrl,
        h("button", { type: "button", onclick: () => (pluginUrl.value.trim() && (plugins.push(pluginUrl.value.trim()), (pluginUrl.value = ""), drawPlugins())) }, "Add"),
      ),
      pluginFields.map(({ f, el }) => h("label", { class: "field" }, h("span", null, f.label), el, f.help ? h("small", null, f.help) : null)),
      h("p", { class: "hint" }, "A plugin is an ES module whose default export may provide storage, lookups, importers, actions and settings."),
    ),
    h("div", { class: "row" }, saveOthers),
    h(
      "section",
      null,
      h("h3", null, "AI app (MCP)"),
      provider?.remote ? null : h("p", { class: "hint" }, "An AI app can reach a library in a bucket or GitHub, not one in this browser."),
      makeMcp,
      mcpOut,
    ),
    h(
      "section",
      null,
      h("h3", null, "Backup"),
      h("p", { class: "hint" }, "Export these settings (storage, keys, plugins) to set up another device, or import them here."),
      pass,
      h(
        "div",
        { class: "row" },
        h(
          "button",
          {
            type: "button",
            onclick: async () => {
              download("lightkone-settings.json", await exportBackup(app.settings, pass.value), "application/json");
              if (!pass.value) toast("Exported without a passphrase: the file holds your keys in the clear.", 6000);
            },
          },
          "Export settings",
        ),
        h("button", { type: "button", onclick: () => importFile.click() }, "Import settings"),
        importFile,
      ),
    ),
    h(
      "section",
      null,
      h("h3", null, "+ Lightkone bookmarklet"),
      h("p", { class: "hint" }, "Drag this to your bookmarks bar; on a paper's page, click it to add the paper."),
      h("a", { class: "bookmarklet", href: bookmarklet(), onclick: (e: Event) => (e.preventDefault(), toast("Drag it to your bookmarks bar.")) }, "+ Lightkone"),
    ),
  );
  close = modal("Settings", body, { wide: true });
}
