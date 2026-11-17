// Builds plugins/places/src/index.jsx into plugin.js: one self-contained ES module, as Buzz's plugin API v1 requires.
// The source keeps the folder layout of the repository it was written in (plugins/places/ and shared/), so a rebuild
// with the pinned packages is byte-identical to the committed plugin.js. To check: npm ci && npm run verify
// React comes from ctx.react at runtime, so importing react is an error.
import { build } from "esbuild";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL(".", import.meta.url).pathname;
const name = "places";
const outfile = join(root, process.argv[2] ?? "plugin.js");

const hostSupplied = {
  name: "host-supplied",
  setup(build) {
    build.onResolve({ filter: /^(react|react-dom)(\/|$)/ }, ({ path }) => ({
      errors: [{ text: `${path} is supplied by Buzz: use ctx.react` }],
    }));
  },
};

await build({
  entryPoints: [join(root, "plugins", name, "src/index.jsx")],
  outfile,
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  jsx: "transform",
  jsxFactory: "React.createElement",
  jsxFragment: "React.Fragment",
  loader: { ".css": "text", ".svg": "text" },
  legalComments: "inline",
  banner: { js: `// ${name}: built from src/ by build.mjs. Edit the source, not this file.` },
  plugins: [hostSupplied],
  logLevel: "warning",
});

const out = readFileSync(outfile, "utf8");
if (/^\s*import\s/m.test(out)) throw new Error("plugin.js imports a module");
if (!/export\s*\{[^}]*\bapply\b/.test(out) && !/export function apply/.test(out)) throw new Error("plugin.js must export apply(ctx)");
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
if (manifest.apiVersion !== 1) throw new Error("apiVersion must be 1");
console.log(`built ${manifest.id} ${(Buffer.byteLength(out) / 1024).toFixed(0)} KiB -> ${outfile.slice(root.length)}`);
