import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { callMaterialMultimodalAnalysis, getAiConfig } from "./aiProvider";
import { sourceMaterialsDir } from "./paths";
import { resolvePythonPath } from "./runtime";
import type { MaterialKind, SourceMaterial } from "@/types/domain";

export const maxUploadedMaterialFiles = 20;
export const maxUploadedMaterialBytes = readMegabyteLimit("ARTIST_STUDIO_MAX_UPLOAD_MB", 50, 1, 150) * 1024 * 1024;
export const maxUploadedMaterialRequestBytes = readMegabyteLimit("ARTIST_STUDIO_MAX_UPLOAD_TOTAL_MB", 100, 1, 300) * 1024 * 1024;
const maxDeepExtractionBytes = readMegabyteLimit("ARTIST_STUDIO_MAX_EXTRACTION_MB", 50, 1, 150) * 1024 * 1024;
const maxImageInputPixels = readNumberLimit("ARTIST_STUDIO_MAX_IMAGE_PIXELS", 100_000_000, 1_000_000, 250_000_000);
const metadataOnlyImageExtensions = new Set([".psd", ".cr2"]);
const deepExtractionExtensions = new Set([".pdf", ".doc", ".docx", ".pptx", ".key", ".idml", ".rtf", ".mp4", ".mov", ".m4v", ".webm", ".avi", ".mp3", ".m4a", ".wav"]);
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
  ".mp4",
  ".mov",
  ".m4v",
  ".webm",
  ".avi",
  ".mp3",
  ".m4a",
  ".wav",
  ".rar"
]);

type UploadedMaterial = Pick<SourceMaterial, "id" | "kind" | "title" | "content" | "analysis" | "fileName" | "filePath" | "mimeType" | "createdAt" | "updatedAt">;
type ImageMetadata = {
  width?: number;
  height?: number;
  format?: string;
  space?: string;
  pages?: number;
  density?: number;
  error?: string;
};
type MaterialAnalysis = {
  version: 2;
  generatedAt: string;
  file: {
    name: string;
    path: string;
    mimeType: string;
    extension: string;
    sizeBytes: number;
  };
  local: {
    text: string;
    metadata: string;
    ocrText: string;
    embeddedMedia: string[];
    warnings: string[];
  };
  multimodal: {
    status: "completed" | "not_configured" | "unsupported" | "failed" | "skipped";
    summary: string;
    provider?: string;
    model?: string;
    error?: string;
  };
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

  const analysis = await analyzeMaterialFile(filePath, originalName, file.type || mimeFromExtension(ext));
  const extracted = renderMaterialContent(analysis);
  return {
    id: 0,
    kind: guessMaterialKind(originalName, file.type, extracted),
    title: originalName,
    content: extracted,
    analysis: JSON.stringify(analysis, null, 2),
    fileName: originalName,
    filePath,
    mimeType: file.type || mimeFromExtension(ext),
    createdAt: "",
    updatedAt: ""
  };
}

export async function materialFromFile(filePath: string, kindHint?: MaterialKind): Promise<UploadedMaterial> {
  const originalName = path.basename(filePath);
  const ext = path.extname(originalName).toLowerCase();
  const mimeType = mimeFromExtension(ext);
  const analysis = await analyzeMaterialFile(filePath, originalName, mimeType);
  const extracted = renderMaterialContent(analysis);
  const kind = kindHint === "other" ? guessMaterialKind(originalName, mimeType, extracted) : kindHint || guessMaterialKind(originalName, mimeType, extracted);
  return {
    id: 0,
    kind,
    title: originalName,
    content: extracted,
    analysis: JSON.stringify(analysis, null, 2),
    fileName: originalName,
    filePath,
    mimeType,
    createdAt: "",
    updatedAt: ""
  };
}

export async function extractMaterialText(filePath: string, fileName: string, mimeType: string) {
  return renderMaterialContent(await analyzeMaterialFile(filePath, fileName, mimeType));
}

export async function analyzeMaterialFile(filePath: string, fileName: string, mimeType: string): Promise<MaterialAnalysis> {
  const ext = path.extname(fileName).toLowerCase();
  const fileSize = fs.statSync(filePath).size;
  const warnings: string[] = [];
  const embeddedMedia: string[] = [];
  let text = "";
  let ocrText = "";
  if (fileSize > maxDeepExtractionBytes && (metadataOnlyImageExtensions.has(ext) || deepExtractionExtensions.has(ext))) {
    warnings.push("Large file indexed by metadata only. Export a smaller derivative when full extraction is needed.");
    text = binaryFileSummary(filePath, fileName, warnings[0]);
    return buildMaterialAnalysis(filePath, fileName, mimeType, text, "", [], warnings, await multimodalAnalysis(filePath, fileName, mimeType, text));
  }
  if (mimeType.startsWith("image/") || [".jpg", ".jpeg", ".png", ".gif", ".webp", ".tif", ".tiff", ".psd", ".cr2"].includes(ext)) {
    text = await imageSummary(filePath, fileName);
    ocrText = runImageOcr(filePath);
    if (!ocrText) warnings.push("Image OCR unavailable or no readable text detected.");
    return buildMaterialAnalysis(filePath, fileName, mimeType, text, ocrText, [], warnings, await multimodalAnalysis(filePath, fileName, mimeType, text));
  }
  if (ext === ".pdf" || mimeType === "application/pdf") {
    text = runPythonExtractor("pdf", filePath);
    if (!hasUsefulExtractedText(text)) {
      const fallbackText = runCommand("pdftotext", ["-layout", filePath, "-"]);
      if (hasUsefulExtractedText(fallbackText)) text = fallbackText;
    }
    if (!hasUsefulExtractedText(text)) {
      ocrText = runPdfOcr(filePath);
      if (ocrText) text = [text, "\nOCR text:\n", ocrText].filter(Boolean).join("\n");
      else warnings.push("No embedded PDF text found and PDF OCR tools are unavailable.");
    }
    return buildMaterialAnalysis(filePath, fileName, mimeType, text, ocrText, [], warnings, await multimodalAnalysis(filePath, fileName, mimeType, text));
  }
  if (ext === ".docx" || mimeType.includes("wordprocessingml")) {
    text = runPythonExtractor("docx", filePath);
    return buildMaterialAnalysis(filePath, fileName, mimeType, text, "", [], warnings, skippedMultimodal("Text document analyzed through local extraction."));
  }
  if (ext === ".pptx") {
    text = runPythonExtractor("pptx", filePath);
    embeddedMedia.push(...extractEmbeddedMediaNames(text));
    return buildMaterialAnalysis(filePath, fileName, mimeType, text, "", embeddedMedia, warnings, skippedMultimodal("PPTX visual media indexed; export slides to images/PDF for per-slide vision analysis."));
  }
  if (ext === ".idml") {
    text = runPythonExtractor("idml", filePath);
    embeddedMedia.push(...extractEmbeddedMediaNames(text));
    return buildMaterialAnalysis(filePath, fileName, mimeType, text, "", embeddedMedia, warnings, skippedMultimodal("IDML text and media entries indexed locally."));
  }
  if (ext === ".key") {
    text = runPythonExtractor("key", filePath);
    embeddedMedia.push(...extractEmbeddedMediaNames(text));
    return buildMaterialAnalysis(filePath, fileName, mimeType, text, "", embeddedMedia, warnings, skippedMultimodal("Keynote text extraction is best-effort; export to PDF/PPTX for stronger analysis."));
  }
  if (ext === ".indd") {
    warnings.push("Adobe InDesign document. Direct text extraction requires InDesign export to IDML/PDF.");
    text = binaryFileSummary(filePath, fileName, warnings[0]);
    return buildMaterialAnalysis(filePath, fileName, mimeType, text, "", [], warnings, skippedMultimodal("Native INDD cannot be decoded directly by this scanner."));
  }
  if ([".mp3", ".m4a", ".wav"].includes(ext)) {
    text = mediaSummary(filePath, fileName, "Audio file. Transcript extraction requires a configured speech-to-text tool or a transcript sidecar file.");
    warnings.push("Audio transcription is not available in the local scanner.");
    return buildMaterialAnalysis(filePath, fileName, mimeType, text, "", [], warnings, skippedMultimodal("Audio metadata indexed; transcript should be supplied or generated by Codex/provider workflow."));
  }
  if ([".mp4", ".mov", ".m4v", ".webm", ".avi"].includes(ext)) {
    text = mediaSummary(filePath, fileName, "Video file. Key metadata is indexed; extract stills or transcript for deeper review.");
    const stills = extractVideoStills(filePath);
    embeddedMedia.push(...stills);
    warnings.push(stills.length ? "Video stills extracted for downstream visual review." : "Video frame extraction unavailable; install ffmpeg for local still extraction.");
    return buildMaterialAnalysis(filePath, fileName, mimeType, text, "", embeddedMedia, warnings, skippedMultimodal("Video metadata and still paths indexed; Codex can inspect still files when available."));
  }
  if (ext === ".rar") {
    warnings.push("RAR archive contents require an unrar-capable extractor; file metadata is indexed.");
    text = binaryFileSummary(filePath, fileName, warnings[0]);
    return buildMaterialAnalysis(filePath, fileName, mimeType, text, "", [], warnings, skippedMultimodal("Archive not expanded."));
  }
  if ([".doc", ".rtf"].includes(ext)) {
    text = runTextutil(filePath);
    return buildMaterialAnalysis(filePath, fileName, mimeType, text, "", [], warnings, skippedMultimodal("Legacy document analyzed through local text conversion."));
  }
  if ([".txt", ".md", ".csv", ".json"].includes(ext)) {
    text = fs.readFileSync(filePath, "utf8");
    return buildMaterialAnalysis(filePath, fileName, mimeType, text, "", [], warnings, skippedMultimodal("Plain text file."));
  }
  warnings.push("Unsupported text extraction format. File metadata is indexed only.");
  text = binaryFileSummary(filePath, fileName, warnings[0]);
  return buildMaterialAnalysis(filePath, fileName, mimeType, text, "", [], warnings, skippedMultimodal("Unsupported file type."));
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
    return await sharp(filePath, { limitInputPixels: maxImageInputPixels }).metadata();
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

function mediaSummary(filePath: string, fileName: string, note: string) {
  return [
    binaryFileSummary(filePath, fileName, note),
    runCommand("ffprobe", ["-v", "error", "-show_format", "-show_streams", filePath])
  ].filter(Boolean).join("\n");
}

function buildMaterialAnalysis(
  filePath: string,
  fileName: string,
  mimeType: string,
  text: string,
  ocrText: string,
  embeddedMedia: string[],
  warnings: string[],
  multimodal: MaterialAnalysis["multimodal"]
): MaterialAnalysis {
  const ext = path.extname(fileName).toLowerCase();
  return {
    version: 2,
    generatedAt: new Date().toISOString(),
    file: {
      name: fileName,
      path: filePath,
      mimeType,
      extension: ext,
      sizeBytes: fs.statSync(filePath).size
    },
    local: {
      text,
      metadata: systemMetadata(filePath),
      ocrText,
      embeddedMedia,
      warnings
    },
    multimodal
  };
}

function renderMaterialContent(analysis: MaterialAnalysis) {
  return [
    `File: ${analysis.file.name}`,
    `Path: ${analysis.file.path}`,
    `MIME type: ${analysis.file.mimeType}`,
    `Size: ${formatBytes(analysis.file.sizeBytes)}`,
    "",
    analysis.local.text ? `Extracted text / metadata:\n${analysis.local.text}` : "",
    analysis.local.ocrText ? `\nOCR text:\n${analysis.local.ocrText}` : "",
    analysis.multimodal.summary ? `\nMultimodal visual/audio analysis:\n${analysis.multimodal.summary}` : "",
    analysis.local.embeddedMedia.length ? `\nEmbedded or derived media:\n${analysis.local.embeddedMedia.map((item) => `- ${item}`).join("\n")}` : "",
    analysis.local.warnings.length ? `\nWarnings:\n${analysis.local.warnings.map((item) => `- ${item}`).join("\n")}` : "",
    `\nAnalysis status: local extraction plus multimodal ${analysis.multimodal.status}.`
  ].filter(Boolean).join("\n");
}

async function multimodalAnalysis(filePath: string, fileName: string, mimeType: string, localText: string): Promise<MaterialAnalysis["multimodal"]> {
  if (!getAiConfig()) return { status: "not_configured", summary: "External multimodal model is not configured." };
  if (!isVisionInput(fileName, mimeType)) return { status: "unsupported", summary: "This file type is not sent directly to the multimodal provider; local extraction and file path are retained." };
  try {
    const result = await callMaterialMultimodalAnalysis({
      filePath,
      fileName,
      mimeType,
      prompt: [
        "Analyze this artist source material for application work.",
        "Describe visible artwork/content, readable text, style, installation/context, and any risks or missing facts.",
        "Use concise bilingual-friendly English. Do not invent title, date, dimensions, eligibility, awards, or authorship.",
        localText ? `Local metadata/extracted text:\n${localText.slice(0, 3000)}` : ""
      ].filter(Boolean).join("\n\n")
    });
    return { status: "completed", summary: result.content, provider: result.provider, model: result.model };
  } catch (error) {
    return {
      status: "failed",
      summary: "Multimodal provider analysis failed; local extraction is still available.",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function skippedMultimodal(summary: string): MaterialAnalysis["multimodal"] {
  return { status: "skipped", summary };
}

function isVisionInput(fileName: string, mimeType: string) {
  const ext = path.extname(fileName).toLowerCase();
  return mimeType.startsWith("image/") || [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext);
}

function hasUsefulExtractedText(value: string) {
  return value.replace(/File saved at .*|Text extraction failed:.*|[\s\d\W]/g, "").length > 20;
}

function runImageOcr(filePath: string) {
  if (!commandAvailable("tesseract")) return "";
  return runCommand("tesseract", [filePath, "stdout", "-l", "eng+chi_sim"]);
}

function runPdfOcr(filePath: string) {
  if (!commandAvailable("pdftoppm") || !commandAvailable("tesseract")) return "";
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "artist-studio-pdf-ocr-"));
  const prefix = path.join(dir, "page");
  try {
    execFileSync("pdftoppm", ["-f", "1", "-l", "5", "-png", "-r", "180", filePath, prefix], { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 });
    const images = fs.readdirSync(dir).filter((name) => name.endsWith(".png")).sort().map((name) => path.join(dir, name));
    return images.map((imagePath, index) => {
      const text = runCommand("tesseract", [imagePath, "stdout", "-l", "eng+chi_sim"]);
      return text.trim() ? `[OCR Page ${index + 1}]\n${text.trim()}` : "";
    }).filter(Boolean).join("\n\n");
  } catch {
    return "";
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function extractVideoStills(filePath: string) {
  if (!commandAvailable("ffmpeg")) return [];
  const dir = path.join(sourceMaterialsDir, ".derived", `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`);
  fs.mkdirSync(dir, { recursive: true });
  const outputPattern = path.join(dir, "still-%03d.jpg");
  try {
    execFileSync("ffmpeg", ["-y", "-i", filePath, "-vf", "fps=1/20,scale=1280:-1", "-frames:v", "8", outputPattern], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
    return fs.readdirSync(dir).filter((name) => name.endsWith(".jpg")).sort().map((name) => path.join(dir, name));
  } catch {
    fs.rmSync(dir, { recursive: true, force: true });
    return [];
  }
}

function extractEmbeddedMediaNames(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2))
    .filter((line) => /\.(jpe?g|png|gif|tiff?|mov|mp4|mp3|pdf|psd)$/i.test(line))
    .slice(0, 120);
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
                info = zf.getinfo(name)
                if info.file_size > 2 * 1024 * 1024:
                    continue
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
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".mov") return "video/quicktime";
  if (ext === ".m4v") return "video/x-m4v";
  if (ext === ".webm") return "video/webm";
  if (ext === ".avi") return "video/x-msvideo";
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".m4a") return "audio/mp4";
  if (ext === ".wav") return "audio/wav";
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

function commandAvailable(command: string) {
  try {
    execFileSync("which", [command], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return true;
  } catch {
    return false;
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

function readMegabyteLimit(name: string, fallback: number, min: number, max: number) {
  return readNumberLimit(name, fallback, min, max);
}

function readNumberLimit(name: string, fallback: number, min: number, max: number) {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(Math.trunc(value), max));
}
