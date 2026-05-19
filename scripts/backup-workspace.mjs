import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupRoot = path.join(root, "backups", stamp);

const sources = [
  "data",
  "artist-assets",
  path.join("generated", "final-submissions")
];

fs.mkdirSync(backupRoot, { recursive: true });

for (const source of sources) {
  const from = path.join(root, source);
  if (!fs.existsSync(from)) continue;
  const to = path.join(backupRoot, source);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, {
    recursive: true,
    filter: (filePath) => !filePath.includes(`${path.sep}.DS_Store`)
  });
}

const manifest = {
  createdAt: new Date().toISOString(),
  sourceRoot: root,
  backupRoot,
  included: sources.filter((source) => fs.existsSync(path.join(root, source)))
};

fs.writeFileSync(path.join(backupRoot, "backup-manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
console.log(`Backup created: ${backupRoot}`);
