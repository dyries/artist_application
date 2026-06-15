import fs from "node:fs";
import path from "node:path";
import childProcess from "node:child_process";
import { findBannedExternalTerms } from "./outputSanitizer";
import { resolvePythonPath } from "./runtime";

const defaultMaxExternalFileMb = readPositiveInt("ARTIST_STUDIO_MAX_EXTERNAL_FILE_MB", 20);
const allowedExternalExtensions = new Set([".md", ".txt", ".html", ".pdf", ".jpg", ".jpeg", ".png", ".webp"]);

export function checkExternalSubmissionFiles(externalDir: string, maxMb = defaultMaxExternalFileMb) {
  const files = listFiles(externalDir);
  const issues: string[] = [];
  const maxBytes = maxMb * 1024 * 1024;
  const textScans: Array<{
    path: string;
    status: "scanned" | "not_applicable" | "unavailable";
    extractedCharacters: number;
    forbiddenTerms: string[];
    error?: string;
  }> = [];

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
    const textScan = scanExternalFileText(filePath, ext);
    textScans.push({ path: relativePath, ...textScan });
    if (textScan.status === "unavailable" && ext === ".pdf") {
      issues.push(`External PDF text inspection unavailable: ${relativePath}${textScan.error ? ` (${textScan.error})` : ""}`);
    }
    if (textScan.forbiddenTerms.length) {
      issues.push(`External file contains forbidden language: ${relativePath}: ${textScan.forbiddenTerms.join(", ")}`);
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
    textScans,
    issues,
    passed: issues.length === 0
  };
}

function scanExternalFileText(filePath: string, extension: string) {
  if ([".md", ".txt", ".html"].includes(extension)) {
    const text = fs.readFileSync(filePath, "utf8");
    return {
      status: "scanned" as const,
      extractedCharacters: text.length,
      forbiddenTerms: findBannedExternalTerms(text)
    };
  }
  if (extension === ".pdf") {
    const extracted = extractPdfText(filePath);
    if (!extracted.ok) {
      return {
        status: "unavailable" as const,
        extractedCharacters: 0,
        forbiddenTerms: [],
        error: extracted.error
      };
    }
    return {
      status: "scanned" as const,
      extractedCharacters: extracted.text.length,
      forbiddenTerms: findBannedExternalTerms(extracted.text)
    };
  }
  return {
    status: "not_applicable" as const,
    extractedCharacters: 0,
    forbiddenTerms: []
  };
}

function extractPdfText(filePath: string): { ok: true; text: string } | { ok: false; error: string } {
  const pythonPath = resolvePythonPath();
  if (!pythonPath) return { ok: false, error: "Python runtime with pypdf was not found" };
  try {
    const code = [
      "import sys",
      "from pypdf import PdfReader",
      "reader = PdfReader(sys.argv[1])",
      "print('\\n'.join((page.extract_text() or '') for page in reader.pages))"
    ].join("\n");
    const text = childProcess.execFileSync(pythonPath, ["-c", code, filePath], {
      encoding: "utf8",
      timeout: 30000,
      maxBuffer: 20 * 1024 * 1024
    });
    return { ok: true, text };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "pypdf extraction failed" };
  }
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
