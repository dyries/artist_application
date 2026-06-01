import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { upsertOpportunity } from "./db";
import { mapWithConcurrency } from "./concurrency";
import { extractMaterialText } from "./fileMaterials";
import { assertPublicOpportunityUrl } from "./urlSecurity";
import type { Opportunity } from "@/types/domain";

type PageFetchResult = {
  opportunityId: number;
  url: string;
  ok: boolean;
  title: string;
  content: string;
  error?: string;
  mode?: string;
  attachments?: string[];
  forms?: string[];
};

const maxOpportunityPagesPerRun = readPositiveInt("ARTIST_STUDIO_MAX_OPPORTUNITY_PAGES", 100);
const maxPageTextLength = readPositiveInt("ARTIST_STUDIO_OPPORTUNITY_TEXT_LIMIT", 60000);
const maxPageBytes = readPositiveInt("ARTIST_STUDIO_OPPORTUNITY_MAX_MB", 5) * 1024 * 1024;
const maxRedirects = readPositiveInt("ARTIST_STUDIO_OPPORTUNITY_MAX_REDIRECTS", 8);
const fetchTimeoutMs = readPositiveInt("ARTIST_STUDIO_OPPORTUNITY_TIMEOUT_MS", 30000);
const fetchConcurrency = readPositiveInt("ARTIST_STUDIO_OPPORTUNITY_FETCH_CONCURRENCY", 4);
const maxOpportunityAttachments = readPositiveInt("ARTIST_STUDIO_OPPORTUNITY_MAX_ATTACHMENTS", 6);
const renderJsPages = readBoolean("ARTIST_STUDIO_RENDER_JS_OPPORTUNITY_PAGES", true);

export async function refreshOpportunityPages(opportunities: Opportunity[], limit = maxOpportunityPagesPerRun, options: { persist?: boolean } = {}) {
  const persist = options.persist ?? true;
  const pageLimit = Math.max(1, Math.min(maxOpportunityPagesPerRun, Math.trunc(limit)));
  const targets = opportunities
    .filter((opportunity) => opportunity.url.startsWith("http"))
    .filter((opportunity) => opportunity.source === "user-provided-link" || opportunity.rawContent.trim().length === 0)
    .slice(0, pageLimit);

  const results = await mapWithConcurrency(targets, fetchConcurrency, async (opportunity) => {
    const result = await fetchOpportunityPage(opportunity);
    if (persist) {
      upsertOpportunity({
        ...opportunity,
        title: result.title || opportunity.title || opportunity.url,
        rawContent: result.content || opportunity.rawContent,
        risks: result.ok
          ? [
            opportunity.risks,
            "Page fetched by project automation; model must still verify facts against the rendered/source text, discovered attachments, and form summary.",
            result.forms?.length ? "Submission form fields were detected; user/Codex review may be required before submission." : ""
          ].filter(Boolean).join("\n")
          : [opportunity.risks, `Page fetch failed: ${result.error}`].filter(Boolean).join("\n"),
        summary: result.ok
          ? opportunity.summary || "User-provided opportunity link fetched by project automation. Awaiting model verification."
          : opportunity.summary || "User-provided opportunity link could not be fetched by project automation. Codex automation may need browser verification.",
        source: opportunity.source || "user-provided-link"
      });
    }
    return result;
  });

  return results;
}

async function fetchOpportunityPage(opportunity: Opportunity): Promise<PageFetchResult> {
  try {
    const url = await assertPublicOpportunityUrl(opportunity.url);
    const page = renderJsPages ? await renderOpportunityPage(url) : null;
    const fetched = page ?? await fetchStaticOpportunityPage(url);
    const attachmentResults = await fetchOpportunityAttachments(fetched.links, url);
    const title = fetched.title || opportunity.title || opportunity.url;
    const content = renderOpportunityContent(fetched, attachmentResults);
    return {
      opportunityId: opportunity.id,
      url: opportunity.url,
      ok: true,
      title,
      content: content.slice(0, maxPageTextLength),
      mode: fetched.mode,
      attachments: attachmentResults.map((item) => item.url),
      forms: fetched.forms
    };
  } catch (error) {
    return {
      opportunityId: opportunity.id,
      url: opportunity.url,
      ok: false,
      title: opportunity.title,
      content: "",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

type ExtractedPage = {
  mode: "browser-rendered" | "static-fetch" | "downloaded-file";
  title: string;
  text: string;
  html: string;
  links: string[];
  forms: string[];
  diagnostics: string[];
};

type AttachmentResult = {
  url: string;
  title: string;
  content: string;
  error?: string;
};

type BrowserLike = {
  newPage: (options: { userAgent: string }) => Promise<PageLike>;
  close: () => Promise<void>;
};

type PageLike = {
  goto: (url: string, options: { waitUntil: string; timeout: number }) => Promise<unknown>;
  title: () => Promise<string>;
  content: () => Promise<string>;
  locator: (selector: string) => { innerText: (options: { timeout: number }) => Promise<string> };
  $$eval: <T>(selector: string, callback: (nodes: Element[]) => T) => Promise<T>;
};

async function fetchStaticOpportunityPage(url: string): Promise<ExtractedPage> {
  const response = await fetchPublicPage(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  const buffer = await readBufferWithLimit(response, maxPageBytes);
  if (isDownloadableDocument(contentType, url)) {
    const title = path.basename(new URL(url).pathname) || url;
    const content = await extractDownloadedDocument(buffer, title, contentType);
    return {
      mode: "downloaded-file",
      title,
      text: content,
      html: "",
      links: [],
      forms: [],
      diagnostics: [`Downloaded opportunity document content type: ${contentType || "unknown"}`]
    };
  }
  if (!isReadableTextContent(contentType)) throw new Error(`Unsupported opportunity page content type: ${contentType || "unknown"}`);
  const html = new TextDecoder().decode(buffer);
  return {
    mode: "static-fetch",
    title: extractTitle(html) || url,
    text: contentType.includes("html") ? htmlToText(html) : html,
    html,
    links: extractLinks(html, url),
    forms: extractForms(html),
    diagnostics: [`Static fetch content type: ${contentType || "unknown"}`]
  };
}

async function renderOpportunityPage(url: string): Promise<ExtractedPage | null> {
  const playwright = loadPlaywright();
  if (!playwright) return null;
  let browser: BrowserLike | null = null;
  try {
    browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage({ userAgent: "ArtistStudio/0.1 (+rendered opportunity verification)" });
    await page.goto(url, { waitUntil: "networkidle", timeout: fetchTimeoutMs });
    const title = await page.title();
    const html = await page.content();
    const text = await page.locator("body").innerText({ timeout: Math.min(10000, fetchTimeoutMs) }).catch(() => htmlToText(html));
    const links = await page.$$eval("a[href]", (nodes: Element[]) => nodes.map((node) => (node as HTMLAnchorElement).href).filter(Boolean)).catch(() => extractLinks(html, url));
    const forms = await page.$$eval("form", (forms: Element[]) => forms.map((form, index) => {
      const fields = Array.from(form.querySelectorAll("input, textarea, select, button")).map((field) => {
        const el = field as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement;
        const label = el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.getAttribute("name") || el.id || el.textContent || el.tagName.toLowerCase();
        const type = el.getAttribute("type") || el.tagName.toLowerCase();
        return `${type}:${String(label).trim()}`.slice(0, 140);
      });
      return `Form ${index + 1}: ${fields.join(", ") || "fields not named"}`;
    })).catch(() => extractForms(html));
    return {
      mode: "browser-rendered",
      title: title || extractTitle(html) || url,
      text,
      html,
      links: links.map((link: string) => normalizeLink(link, url)).filter(Boolean),
      forms,
      diagnostics: ["Browser-rendered with Playwright."]
    };
  } catch {
    return null;
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }
}

function loadPlaywright(): { chromium: { launch: (options: { headless: boolean }) => Promise<BrowserLike> } } | null {
  try {
    const req = eval("require") as NodeRequire;
    return req("playwright");
  } catch {
    return null;
  }
}

function isReadableTextContent(contentType: string) {
  const normalized = contentType.toLowerCase();
  return !normalized || normalized.includes("text/") || normalized.includes("html") || normalized.includes("xml") || normalized.includes("json");
}

function isDownloadableDocument(contentType: string, url: string) {
  const normalized = contentType.toLowerCase();
  const ext = path.extname(new URL(url).pathname).toLowerCase();
  return normalized.includes("pdf")
    || normalized.includes("word")
    || normalized.includes("presentation")
    || [".pdf", ".doc", ".docx", ".rtf", ".pptx"].includes(ext);
}

async function fetchPublicPage(initialUrl: string) {
  let url = initialUrl;
  for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "ArtistStudio/0.1 (+project automation)",
        "Accept": "text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.8"
      },
      redirect: "manual",
      signal: AbortSignal.timeout(fetchTimeoutMs)
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return response;
    }

    const location = response.headers.get("location");
    if (!location) throw new Error("Redirect response did not include a location.");
    url = await assertPublicOpportunityUrl(new URL(location, url).toString());
  }
  throw new Error("Opportunity URL redirected too many times.");
}

function readPositiveInt(name: string, fallback: number) {
  const value = Number(process.env[name] || "");
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function readBoolean(name: string, fallback: boolean) {
  const value = process.env[name]?.toLowerCase();
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value);
}

async function readBufferWithLimit(response: Response, maxBytes: number) {
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > maxBytes) throw new Error("Opportunity page is too large.");
  if (!response.body) return new Uint8Array(await response.arrayBuffer());

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      reader.cancel().catch(() => undefined);
      throw new Error("Opportunity page is too large.");
    }
    chunks.push(value);
  }

  const buffer = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return buffer;
}

async function fetchOpportunityAttachments(links: string[], pageUrl: string): Promise<AttachmentResult[]> {
  const candidates = Array.from(new Set(links.map((link) => normalizeLink(link, pageUrl)).filter(Boolean)))
    .filter((link) => /\.(pdf|docx?|rtf|pptx)(\?|#|$)/i.test(link))
    .slice(0, maxOpportunityAttachments);
  return mapWithConcurrency(candidates, 2, async (link) => {
    try {
      const safeUrl = await assertPublicOpportunityUrl(link);
      const response = await fetchPublicPage(safeUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const contentType = response.headers.get("content-type") || "";
      const buffer = await readBufferWithLimit(response, maxPageBytes);
      const title = path.basename(new URL(safeUrl).pathname) || safeUrl;
      const content = await extractDownloadedDocument(buffer, title, contentType);
      return { url: safeUrl, title, content };
    } catch (error) {
      return { url: link, title: link, content: "", error: error instanceof Error ? error.message : String(error) };
    }
  });
}

async function extractDownloadedDocument(buffer: Uint8Array, fileName: string, contentType: string) {
  const safeName = fileName.replace(/[^\w.\-\u4e00-\u9fa5]+/g, "_").slice(0, 100) || `download-${crypto.randomBytes(4).toString("hex")}`;
  const ext = path.extname(safeName) || extensionFromContentType(contentType);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "artist-studio-opportunity-"));
  const filePath = path.join(tempDir, path.basename(safeName, path.extname(safeName)) + ext);
  try {
    fs.writeFileSync(filePath, buffer);
    return await extractMaterialText(filePath, path.basename(filePath), contentType || mimeFromExtension(ext));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function renderOpportunityContent(page: ExtractedPage, attachments: AttachmentResult[]) {
  return [
    `Source mode: ${page.mode}`,
    page.diagnostics.join("\n"),
    "",
    "## Page Text",
    page.text,
    page.forms.length ? `\n## Detected Forms\n${page.forms.map((form) => `- ${form}`).join("\n")}` : "",
    page.links.length ? `\n## Discovered Links\n${page.links.slice(0, 80).map((link) => `- ${link}`).join("\n")}` : "",
    attachments.length ? `\n## Downloaded Attachments\n${attachments.map((item) => [
      `### ${item.title}`,
      `URL: ${item.url}`,
      item.error ? `Fetch failed: ${item.error}` : item.content
    ].join("\n")).join("\n\n")}` : ""
  ].filter(Boolean).join("\n");
}

function extractLinks(html: string, baseUrl: string) {
  return Array.from(html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi))
    .map((match) => normalizeLink(match[1], baseUrl))
    .filter(Boolean);
}

function normalizeLink(link: string, baseUrl: string) {
  try {
    const url = new URL(link, baseUrl);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function extractForms(html: string) {
  return Array.from(html.matchAll(/<form\b[\s\S]*?<\/form>/gi)).map((match, index) => {
    const form = match[0];
    const fields = Array.from(form.matchAll(/<(input|textarea|select|button)\b([^>]*)>/gi)).map((field) => {
      const attrs = field[2] || "";
      const type = attr(attrs, "type") || field[1].toLowerCase();
      const label = attr(attrs, "aria-label") || attr(attrs, "placeholder") || attr(attrs, "name") || attr(attrs, "id") || field[1].toLowerCase();
      return `${type}:${label}`.slice(0, 140);
    });
    return `Form ${index + 1}: ${fields.join(", ") || "fields not named"}`;
  });
}

function attr(attrs: string, name: string) {
  const match = attrs.match(new RegExp(`${name}=["']([^"']+)["']`, "i"));
  return match ? decodeEntities(match[1]).trim() : "";
}

function extensionFromContentType(contentType: string) {
  const normalized = contentType.toLowerCase();
  if (normalized.includes("pdf")) return ".pdf";
  if (normalized.includes("wordprocessingml")) return ".docx";
  if (normalized.includes("msword")) return ".doc";
  if (normalized.includes("presentationml")) return ".pptx";
  if (normalized.includes("rtf")) return ".rtf";
  return ".txt";
}

function mimeFromExtension(ext: string) {
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === ".doc") return "application/msword";
  if (ext === ".pptx") return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (ext === ".rtf") return "application/rtf";
  return "text/plain";
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(match[1]).replace(/\s+/g, " ").trim() : "";
}

function htmlToText(html: string) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<\/(p|div|section|article|li|tr|h[1-6])>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}
