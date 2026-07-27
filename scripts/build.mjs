import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = resolve(root, "src");
const output = resolve(root, "dist");

await rm(output, { force: true, recursive: true });
await mkdir(output, { recursive: true });

await build({
  bundle: true,
  entryPoints: {
    converter: resolve(source, "converter/converter.js"),
    popup: resolve(source, "popup/popup.js")
  },
  format: "iife",
  outdir: output,
  platform: "browser",
  target: "chrome114"
});

await Promise.all([
  cp(resolve(source, "manifest.json"), resolve(output, "manifest.json")),
  cp(resolve(source, "popup/popup.html"), resolve(output, "popup.html")),
  cp(resolve(source, "popup/popup.css"), resolve(output, "popup.css"))
]);
