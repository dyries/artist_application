import fs from "node:fs";
import path from "node:path";

const defaultMaxExternalFileMb = readPositiveInt("ARTIST_STUDIO_MAX_EXTERNAL_FILE_MB", 20);
const allowedExternalExtensions = new Set([".md", ".txt", ".html", ".pdf", ".jpg", ".jpeg", ".png", ".webp"]);

export function checkExternalSubmissionFiles(externalDir: string, maxMb = defaultMaxExternalFileMb) {
  const files = listFiles(externalDir);
  const issues: string[] = [];
  const maxBytes = maxMb * 1024 * 1024;

  for (const filePath of files) {
    const relativePath = path.relative(externalDir, filePath);
    const stat = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    if (!allowedExternalExtensions.has(ext)) {
      issues.push(`Unsupported external file extension: ${relativePath}`);
    }
    if (stat.size > maxBytes) {
      issues.push(`External file is larger than ${maxMb}MB: ${relativePath}`);
    }
  }

  return {
    checkedAt: new Date().toISOString(),
    maxMb,
    files: files.map((filePath) => ({
      path: path.relative(externalDir, filePath),
      bytes: fs.statSync(filePath).size,
      extension: path.extname(filePath).toLowerCase()
    })),
    issues,
    passed: issues.length === 0
  };
}

function listFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

function readPositiveInt(name: string, fallback: number) {
  const value = Number(process.env[name] || "");
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
