import fs from "node:fs";
import path from "node:path";
import { mapWithConcurrency } from "./concurrency";
import { materialFromFile } from "./fileMaterials";
import { materialsInboxDir } from "./paths";
import type { MaterialKind, SourceMaterial } from "@/types/domain";

const folderKinds: Record<string, MaterialKind> = {
  cv: "cv",
  "01-cv": "cv",
  "简历": "cv",
  "履历": "cv",
  statement: "statement",
  "02-statement": "statement",
  "艺术家陈述": "statement",
  "创作自述": "statement",
  bio: "bio",
  "03-bio": "bio",
  "简介": "bio",
  portfolio: "portfolio",
  "04-portfolio": "portfolio",
  "作品集": "portfolio",
  works: "works",
  "05-works": "works",
  "作品资料": "works",
  "work-images": "works",
  "作品图片": "works",
  images: "works",
  "图片": "works",
  other: "other",
  "99-other": "other",
  "其他": "other"
};

const supportedExtensions = new Set([
  ".txt",
  ".md",
  ".csv",
  ".json",
  ".rtf",
  ".pdf",
  ".doc",
  ".docx",
  ".pptx",
  ".key",
  ".indd",
  ".idml",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".tif",
  ".tiff",
  ".psd",
  ".cr2",
  ".mp3",
  ".rar"
]);

export async function scanMaterialsInbox(existingFilePaths: string[]): Promise<SourceMaterial[]> {
  ensureInboxFolders();
  const existing = new Set(existingFilePaths);
  const files = listFiles(materialsInboxDir)
    .filter((filePath) => supportedExtensions.has(path.extname(filePath).toLowerCase()))
    .filter((filePath) => !existing.has(filePath));

  const materials = await mapWithConcurrency(files, 4, (filePath) => materialFromFile(filePath, kindFromPath(filePath)));
  return materials;
}

export function ensureInboxFolders() {
  for (const folder of ["cv", "statement", "bio", "portfolio", "works", "work-images", "other"]) {
    fs.mkdirSync(path.join(materialsInboxDir, folder), { recursive: true });
  }
}

function listFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.name.startsWith(".")) return [];
    if (entry.isDirectory()) return listFiles(entryPath);
    return entry.isFile() ? [entryPath] : [];
  });
}

function kindFromPath(filePath: string): MaterialKind | undefined {
  const relative = path.relative(materialsInboxDir, filePath);
  const folder = relative.split(path.sep)[0]?.toLowerCase();
  return folderKinds[folder];
}
