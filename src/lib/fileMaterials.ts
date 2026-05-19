import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { sourceMaterialsDir } from "./paths";
import { resolvePythonPath } from "./runtime";
import type { MaterialKind, SourceMaterial } from "@/types/domain";

export const maxUploadedMaterialFiles = 20;
export const maxUploadedMaterialBytes = 150 * 1024 * 1024;
const maxDeepExtractionBytes = 300 * 1024 * 1024;
const metadataOnlyImageExtensions = new Set([".psd", ".cr2"]);
const deepExtractionExtensions = new Set([".pdf", ".doc", ".docx", ".pptx", ".key", ".idml", ".rtf"]);
export const supportedMaterialExtensions = new Set([
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

type UploadedMaterial = Pick<SourceMaterial, "id" | "kind" | "title" | "content" | "fileName" | "filePath" | "mimeType" | "createdAt" | "updatedAt">;
type ImageMetadata = {
  width?: number;
  height?: number;
  format?: string;
  space?: string;
  pages?: number;
  density?: number;
  error?: string;
};

export async function saveUploadedMaterial(file: File): Promise<UploadedMaterial> {
  fs.mkdirSync(sourceMaterialsDir, { recursive: true });
  const originalName = file.name || "material";
  const safeName = safeFileName(originalName);
  const ext = path.extname(safeName).toLowerCase();
  if (!supportedMaterialExtensions.has(ext)) {
    throw new Error(`Unsupported material file type: ${originalName}`);
  }
  if (file.size > maxUploadedMaterialBytes) {
    throw new Error(`Material file is too large: ${originalName}`);
  }
  const storedName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${safeName}`;
  const filePath = path.join(sourceMaterialsDir, storedName);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  const extracted = await extractMaterialText(filePath, originalName, file.type);
  return {
    id: 0,
    kind: guessMaterialKind(originalName, file.type, extracted),
    title: originalName,
    content: extracted,
    fileName: originalName,
    filePath,
    mimeType: file.type || mimeFromExtension(ext),
    createdAt: "",
    updatedAt: ""
  };
}

export async function materialFromLocalFile(filePath: string, kindHint?: MaterialKind): Promise<UploadedMaterial> {
  const originalName = path.basename(filePath);
  const ext = path.extname(originalName).toLowerCase();
  const mimeType = mimeFromExtension(ext);
  const extracted = await extractMaterialText(filePath, originalName, mimeType);
  const kind = kindHint === "other" ? guessMaterialKind(originalName, mimeType, extracted) : kindHint || guessMaterialKind(originalName, mimeType, extracted);
  return {
    id: 0,
    kind,
    title: originalName,
    content: extracted,
    fileName: originalName,
    filePath,
    mimeType,
    createdAt: "",
    updatedAt: ""
  };
}

export async function extractMaterialText(filePath: string, fileName: string, mimeType: string) {
  const ext = path.extname(fileName).toLowerCase();
  const fileSize = fs.statSync(filePath).size;
  if (fileSize > maxDeepExtractionBytes && (metadataOnlyImageExtensions.has(ext) || deepExtractionExtensions.has(ext))) {
    return binaryFileSummary(
      filePath,
      fileName,
      "Large file indexed by metadata only. Export a smaller PDF/PPTX/DOCX derivative when full text extraction is needed."
    );
  }
  if (mimeType.startsWith("image/") || [".jpg", ".jpeg", ".png", ".gif", ".webp", ".tif", ".tiff", ".psd", ".cr2"].includes(ext)) {
    return imageSummary(filePath, fileName);
  }
  if (ext === ".pdf" || mimeType === "application/pdf") {
    return runPythonExtractor("pdf", filePath);
  }
  if (ext === ".docx" || mimeType.includes("wordprocessingml")) {
    return runPythonExtractor("docx", filePath);
  }
  if (ext === ".pptx") {
    return runPythonExtractor("pptx", filePath);
  }
  if (ext === ".idml") {
    return runPythonExtractor("idml", filePath);
  }
  if (ext === ".key") {
    return runPythonExtractor("key", filePath);
  }
  if (ext === ".indd") {
    return binaryFileSummary(filePath, fileName, "Adobe InDesign document. Direct text extraction requires InDesign export to IDML/PDF; sibling Links folders and exported PDFs are still scanned separately when present.");
  }
  if (ext === ".mp3") {
    return binaryFileSummary(filePath, fileName, "Audio file. Transcript extraction is not available locally; system metadata is indexed.");
  }
  if (ext === ".rar") {
    return binaryFileSummary(filePath, fileName, "RAR archive. Archive contents require an unrar-capable extractor; file metadata is indexed.");
  }
  if ([".doc", ".rtf"].includes(ext)) {
    return runTextutil(filePath);
  }
  if ([".txt", ".md", ".csv", ".json"].includes(ext)) {
    return fs.readFileSync(filePath, "utf8");
  }
  return binaryFileSummary(filePath, fileName, "Unsupported text extraction format. File metadata is indexed only.");
}

async function imageSummary(filePath: string, fileName: string) {
  const metadata = await readImageMetadata(filePath);
  const size = [metadata.width, metadata.height].filter(Boolean).join(" x ");
  return [
    `Image file: ${fileName}`,
    `Path: ${filePath}`,
    `Size: ${formatBytes(fs.statSync(filePath).size)}`,
    size ? `Dimensions: ${size}px` : "",
    metadata.format ? `Format: ${metadata.format}` : "",
    metadata.space ? `Color space: ${metadata.space}` : "",
    metadata.pages ? `Pages/frames: ${metadata.pages}` : "",
    metadata.density ? `Density: ${metadata.density} DPI` : "",
    metadata.error ? `Image metadata fallback: ${metadata.error}` : "",
    systemMetadata(filePath),
    "Image pixels are available to the application from this path. Use the filename, folder, dimensions, and visual content when this image represents an artwork."
  ].filter(Boolean).join("\n");
}

async function readImageMetadata(filePath: string): Promise<ImageMetadata> {
  try {
    return await sharp(filePath, { limitInputPixels: false }).metadata();
  } catch (error) {
    const info = runCommand("file", [filePath]);
    const sizeMatch = info.match(/(\d+)\s*x\s*(\d+)/i);
    return {
      width: sizeMatch ? Number(sizeMatch[1]) : undefined,
      height: sizeMatch ? Number(sizeMatch[2]) : undefined,
      format: path.extname(filePath).replace(".", "").toLowerCase() || undefined,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function binaryFileSummary(filePath: string, fileName: string, note: string) {
  return [
    `File: ${fileName}`,
    `Path: ${filePath}`,
    `Size: ${formatBytes(fs.statSync(filePath).size)}`,
    runCommand("file", [filePath]),
    systemMetadata(filePath),
    note
  ].filter(Boolean).join("\n");
}

function runPythonExtractor(kind: "pdf" | "docx" | "pptx" | "idml" | "key", filePath: string) {
  const pythonPath = resolvePythonPath();
  if (!pythonPath) return `File saved at ${filePath}\nText extraction unavailable: bundled Python runtime was not found.`;
  const code = kind === "pdf"
    ? pdfExtractorCode()
    : kind === "docx"
      ? docxExtractorCode()
      : archiveExtractorCode(kind);
  try {
    return execFileSync(pythonPath, ["-c", code, filePath], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }).trim();
  } catch (error) {
    return `File saved at ${filePath}\nText extraction failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function pdfExtractorCode() {
  return `
import sys
from pypdf import PdfReader
reader = PdfReader(sys.argv[1])
parts = []
for idx, page in enumerate(reader.pages, start=1):
    text = page.extract_text() or ""
    if text.strip():
        parts.append(f"[Page {idx}]\\n{text.strip()}")
print("\\n\\n".join(parts))
`;
}

function docxExtractorCode() {
  return `
import sys
from docx import Document
doc = Document(sys.argv[1])
parts = [p.text for p in doc.paragraphs if p.text.strip()]
for table in doc.tables:
    for row in table.rows:
        cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
        if cells:
            parts.append(" | ".join(cells))
print("\\n".join(parts))
`;
}

function archiveExtractorCode(kind: "pptx" | "idml" | "key") {
  const config = JSON.stringify(kind);
  return `
import html
import os
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

kind = ${config}
path = sys.argv[1]

def clean(value):
    value = html.unescape(value or "")
    value = re.sub(r"\\s+", " ", value).strip()
    return value

def add_unique(items, value):
    value = clean(value)
    if not value:
        return
    compact = re.sub(r"\\s+", "", value)
    if len(compact) > 240 and re.fullmatch(r"[A-Za-z0-9+/=_-]+", compact):
        return
    if len(value) > 1200:
        value = value[:1200] + " ..."
    if value and value not in items:
        items.append(value)

def xml_text(data, name):
    out = []
    try:
        root = ET.fromstring(data)
        if kind == "idml":
            for elem in root.iter():
                for attr in ("Content", "Name", "Label", "Self"):
                    if attr in elem.attrib:
                        add_unique(out, elem.attrib[attr])
        else:
            for elem in root.iter():
                tag = elem.tag.rsplit("}", 1)[-1]
                if tag in {"t", "title", "subject", "description", "creator", "keywords", "text"} and elem.text:
                    add_unique(out, elem.text)
        for text in root.itertext():
            if kind != "pptx" or len(clean(text)) > 1:
                add_unique(out, text)
    except Exception:
        raw = data.decode("utf-8", "ignore")
        raw = re.sub(r"<[^>]+>", " ", raw)
        for part in re.split(r"[\\n\\r]+", raw):
            add_unique(out, part)
    return out

try:
    with zipfile.ZipFile(path) as zf:
        names = zf.namelist()
        text_names = []
        media_names = []
        for name in names:
            lower = name.lower()
            if lower.endswith((".jpg", ".jpeg", ".png", ".gif", ".tif", ".tiff", ".mov", ".mp4", ".mp3", ".pdf", ".psd")):
                media_names.append(name)
            if kind == "pptx" and lower.startswith(("ppt/slides/", "ppt/notesSlides/", "docprops/")) and lower.endswith(".xml"):
                text_names.append(name)
            elif kind == "idml" and lower.endswith(".xml") and (lower.startswith("stories/") or lower.startswith("spreads/") or lower.startswith("meta-inf/")):
                text_names.append(name)
            elif kind == "key" and lower.endswith((".xml", ".plist")):
                text_names.append(name)

        texts = []
        for name in text_names[:300]:
            try:
                for value in xml_text(zf.read(name), name):
                    add_unique(texts, value)
            except Exception:
                pass

        print(f"{kind.upper()} file: {os.path.basename(path)}")
        print(f"Path: {path}")
        print(f"Archive entries: {len(names)}")
        if media_names:
            print("Embedded/linked media entries:")
            for name in media_names[:120]:
                print(f"- {name}")
            if len(media_names) > 120:
                print(f"- ... {len(media_names) - 120} more")
        if texts:
            print("\\nExtracted text:")
            print("\\n".join(texts[:2000]))
        elif kind == "key":
            print("No plain XML slide text found. Modern Keynote files often store slide structure in binary .iwa records; export to PDF/PPTX gives stronger text extraction.")
except zipfile.BadZipFile:
    print(f"{kind.upper()} file: {os.path.basename(path)}")
    print(f"Path: {path}")
    print("This file is not a readable zip-style archive. Export to PDF/PPTX/IDML for deeper extraction.")
`;
}

function runTextutil(filePath: string) {
  try {
    return execFileSync("textutil", ["-convert", "txt", "-stdout", filePath], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }).trim();
  } catch {
    return `File saved at ${filePath}\nText extraction failed. Legacy .doc files may need to be opened and saved as .docx first.`;
  }
}

export function guessMaterialKind(fileName: string, mimeType = "", content = ""): MaterialKind {
  const name = `${fileName} ${mimeType}`.toLowerCase();
  const text = `${fileName}\n${content}`.toLowerCase();
  if (name.startsWith("image/") || mimeType.startsWith("image/")) return "works";
  if (/(cv|resume|curriculum vitae|简历|履历)/i.test(text)) return "cv";
  if (/(artist statement|statement|创作自述|艺术家陈述|陈述)/i.test(text)) return "statement";
  if (/(portfolio|作品集|selected works)/i.test(text)) return "portfolio";
  if (/(bio|biography|artist bio|个人简介|艺术家简介|简介)/i.test(text)) return "bio";
  if (/(work|artwork|作品|媒介|尺寸|dimensions|medium)/i.test(text)) return "works";
  return "other";
}

function safeFileName(value: string) {
  return value.replace(/[^\w.\-\u4e00-\u9fa5]+/g, "_").slice(0, 120) || "material";
}

function mimeFromExtension(ext: string) {
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === ".doc") return "application/msword";
  if (ext === ".pptx") return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (ext === ".key") return "application/vnd.apple.keynote";
  if (ext === ".indd") return "application/x-indesign";
  if (ext === ".idml") return "application/vnd.adobe.indesign-idml-package";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".gif") return "image/gif";
  if (ext === ".psd") return "image/vnd.adobe.photoshop";
  if (ext === ".cr2") return "image/x-canon-cr2";
  if (ext === ".webp") return "image/webp";
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".rar") return "application/vnd.rar";
  return "application/octet-stream";
}

function systemMetadata(filePath: string) {
  const mdls = runCommand("mdls", [
    "-name", "kMDItemKind",
    "-name", "kMDItemContentType",
    "-name", "kMDItemPixelWidth",
    "-name", "kMDItemPixelHeight",
    "-name", "kMDItemDurationSeconds",
    "-name", "kMDItemAuthors",
    "-name", "kMDItemTitle",
    filePath
  ]);
  return mdls ? `System metadata:\n${mdls}` : "";
}

function runCommand(command: string, args: string[]) {
  try {
    return execFileSync(command, args, { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 }).trim();
  } catch {
    return "";
  }
}

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}
