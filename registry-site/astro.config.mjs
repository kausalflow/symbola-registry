import { defineConfig } from "astro/config";

// Served under /symbolon/registry/ on GitHub Pages; override for PR previews.
export default defineConfig({
  site: process.env.SITE_ORIGIN ?? "https://kausalflow.github.io",
  base: process.env.SITE_BASE ?? "/symbolon/registry",
  trailingSlash: "always",
  build: { format: "directory" },
});
