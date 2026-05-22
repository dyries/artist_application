import { upsertOpportunity } from "./db";
import { mapWithConcurrency } from "./concurrency";
import { assertPublicOpportunityUrl } from "./urlSecurity";
import type { Opportunity } from "@/types/domain";

type PageFetchResult = {
  opportunityId: number;
  url: string;
  ok: boolean;
  title: string;
  content: string;
  error?: string;
};

const maxOpportunityPagesPerRun = readPositiveInt("ARTIST_STUDIO_MAX_OPPORTUNITY_PAGES", 100);
const maxPageTextLength = readPositiveInt("ARTIST_STUDIO_OPPORTUNITY_TEXT_LIMIT", 60000);
const maxPageBytes = readPositiveInt("ARTIST_STUDIO_OPPORTUNITY_MAX_MB", 5) * 1024 * 1024;
const maxRedirects = readPositiveInt("ARTIST_STUDIO_OPPORTUNITY_MAX_REDIRECTS", 8);
const fetchTimeoutMs = readPositiveInt("ARTIST_STUDIO_OPPORTUNITY_TIMEOUT_MS", 30000);
const fetchConcurrency = readPositiveInt("ARTIST_STUDIO_OPPORTUNITY_FETCH_CONCURRENCY", 4);

export async function refreshOpportunityPages(opportunities: Opportunity[], limit = maxOpportunityPagesPerRun) {
  const pageLimit = Math.max(1, Math.min(maxOpportunityPagesPerRun, Math.trunc(limit)));
  const targets = opportunities
    .filter((opportunity) => opportunity.url.startsWith("http"))
    .filter((opportunity) => opportunity.source === "user-provided-link" || opportunity.rawContent.trim().length === 0)
    .slice(0, pageLimit);

  const results = await mapWithConcurrency(targets, fetchConcurrency, async (opportunity) => {
    const result = await fetchOpportunityPage(opportunity);
    upsertOpportunity({
      ...opportunity,
      title: result.title || opportunity.title || opportunity.url,
      rawContent: result.content || opportunity.rawContent,
      risks: result.ok
        ? [opportunity.risks, "Page fetched by project automation; model must still verify facts against the source text."].filter(Boolean).join("\n")
        : [opportunity.risks, `Page fetch failed: ${result.error}`].filter(Boolean).join("\n"),
      summary: result.ok
        ? opportunity.summary || "User-provided opportunity link fetched by project automation. Awaiting model verification."
        : opportunity.summary || "User-provided opportunity link could not be fetched by project automation. Codex automation may need browser verification.",
      source: opportunity.source || "user-provided-link"
    });
    return result;
  });

  return results;
}

async function fetchOpportunityPage(opportunity: Opportunity): Promise<PageFetchResult> {
  try {
    const url = await assertPublicOpportunityUrl(opportunity.url);
    const response = await fetchPublicPage(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const contentType = response.headers.get("content-type") || "";
    if (!isReadableTextContent(contentType)) {
      throw new Error(`Unsupported opportunity page content type: ${contentType || "unknown"}`);
    }
    const text = await readTextWithLimit(response, maxPageBytes);
    const title = extractTitle(text) || opportunity.title || opportunity.url;
    const content = contentType.includes("html") ? htmlToText(text) : text;
    return {
      opportunityId: opportunity.id,
      url: opportunity.url,
      ok: true,
      title,
      content: content.slice(0, maxPageTextLength)
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

function isReadableTextContent(contentType: string) {
  const normalized = contentType.toLowerCase();
  return !normalized || normalized.includes("text/") || normalized.includes("html") || normalized.includes("xml") || normalized.includes("json");
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

async function readTextWithLimit(response: Response, maxBytes: number) {
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > maxBytes) throw new Error("Opportunity page is too large.");
  if (!response.body) return response.text();

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
  return new TextDecoder().decode(buffer);
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
