// Bundles each component's main.ts into impl/<name>/main.mjs, the program
// symbola runs. The app imports the same impl/<name>/src modules.
import { build } from "esbuild";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../impl/", import.meta.url).pathname;
const only = process.argv.slice(2);
for (const name of readdirSync(root)) {
  const entry = join(root, name, "main.ts");
  if (name.startsWith("_") || !existsSync(entry)) continue;
  if (only.length && !only.includes(name)) continue;
  await build({
    entryPoints: [entry],
    outfile: join(root, name, "main.mjs"),
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    legalComments: "none",
    logLevel: "warning",
  });
  console.log(`built impl/${name}/main.mjs`);
}
