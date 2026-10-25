// Plugins (PRODUCT.md, Interfaces): an ES module loaded from a URL whose
// default export may provide storage providers, lookups, importers, actions
// and settings fields. The built-in backends and lookups use the same shape.
import { bibtexImporter, type Importer } from "./add.ts";
import type { LibraryStore } from "./library.ts";
import { builtinLookups, type Lookup } from "./lookups.ts";
import type { SettingField, StorageProvider } from "./storage/adapter.ts";
import { browserProvider } from "./storage/browser.ts";
import { githubProvider } from "./storage/github.ts";
import { s3Provider } from "./storage/s3.ts";
import type { Paper } from "./types.ts";

export interface PluginApi {
  store: LibraryStore;
  /** Schedules a save after the action changed papers. */
  save(): void;
  toast(message: string): void;
  settings: Record<string, string>;
}

export interface PaperAction {
  id: string;
  label: string;
  /** Whether the button shows for this paper. */
  when?(paper: Paper): boolean;
  run(paper: Paper, api: PluginApi): void | Promise<void>;
}

export interface LightkonePlugin {
  name?: string;
  storage?: StorageProvider[];
  lookups?: Lookup[];
  importers?: Importer[];
  actions?: PaperAction[];
  settings?: SettingField[];
}

export const builtinPlugin: LightkonePlugin = {
  name: "Built in",
  storage: [browserProvider, s3Provider, githubProvider],
  lookups: builtinLookups,
  importers: [bibtexImporter],
};

export interface LoadedPlugins {
  storage: StorageProvider[];
  lookups: Lookup[];
  importers: Importer[];
  actions: PaperAction[];
  settings: SettingField[];
  errors: { url: string; error: string }[];
  names: { url: string; name: string }[];
}

export async function loadPlugins(urls: string[]): Promise<LoadedPlugins> {
  const out: LoadedPlugins = { storage: [], lookups: [], importers: [], actions: [], settings: [], errors: [], names: [] };
  const plugins: { url: string; plugin: LightkonePlugin }[] = [];
  for (const url of urls) {
    try {
      const mod = await import(/* @vite-ignore */ url);
      const plugin = (mod.default ?? mod) as LightkonePlugin;
      plugins.push({ url, plugin });
      out.names.push({ url, name: plugin.name ?? url });
    } catch (e) {
      out.errors.push({ url, error: (e as Error).message });
    }
  }
  // Plugin lookups and importers are tried before the built-in catch-alls.
  for (const { plugin } of plugins) {
    out.storage.push(...(plugin.storage ?? []));
    out.lookups.push(...(plugin.lookups ?? []));
    out.importers.push(...(plugin.importers ?? []));
    out.actions.push(...(plugin.actions ?? []));
    out.settings.push(...(plugin.settings ?? []));
  }
  out.storage.unshift(...builtinPlugin.storage!);
  out.lookups.push(...builtinPlugin.lookups!);
  out.importers.push(...builtinPlugin.importers!);
  return out;
}
