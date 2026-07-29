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
    background: resolve(source, "background/service-worker.js"),
    converter: resolve(source, "converter/converter.js"),
    editor: resolve(source, "editor/editor.js"),
    picker: resolve(source, "converter/picker.js"),
    popup: resolve(source, "popup/popup.js")
  },
  format: "iife",
  outdir: output,
  platform: "browser",
  target: "chrome114"
});

await Promise.all([
  cp(resolve(source, "manifest.json"), resolve(output, "manifest.json")),
  cp(resolve(source, "editor/editor.html"), resolve(output, "editor.html")),
  cp(resolve(source, "editor/editor.css"), resolve(output, "editor.css")),
  cp(resolve(source, "popup/popup.html"), resolve(output, "popup.html")),
  cp(resolve(source, "popup/popup.css"), resolve(output, "popup.css"))
]);
