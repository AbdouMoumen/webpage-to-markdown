import { execFile } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, rm } from "node:fs/promises";
import { once } from "node:events";
import { join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import yazl from "yazl";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const distDirectory = resolve(root, "dist");
const releaseDirectory = resolve(root, "artifacts", "release");
const packageJson = await import(resolve(root, "package.json"), { with: { type: "json" } });
const packageName = packageJson.default.name.replace(/^@/, "").replaceAll("/", "-");
const archivePath = join(releaseDirectory, `${packageName}-${packageJson.default.version}.zip`);
const zipTimestamp = new Date(Date.UTC(1980, 0, 1));

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) {
        return listFiles(path);
      }

      return entry.isFile() ? [path] : [];
    })
  );

  return files.flat().sort();
}

await execFileAsync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"], {
  cwd: root
});

const files = await listFiles(distDirectory);
if (files.length === 0) {
  throw new Error("The build did not produce files to package.");
}

await mkdir(releaseDirectory, { recursive: true });
await rm(archivePath, { force: true });

const archive = new yazl.ZipFile();
for (const file of files) {
  const entryName = relative(distDirectory, file).split(sep).join("/");
  archive.addFile(file, entryName, { mtime: zipTimestamp, mode: 0o100644 });
}

const output = createWriteStream(archivePath);
archive.outputStream.pipe(output);
archive.end();
await once(output, "close");

console.log(`Created ${relative(root, archivePath)} with ${files.length} files.`);
