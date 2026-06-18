import { normalizePublicOpportunityUrl } from "@/lib/urlSecurity";
import type { SearchQuery, SearchResult, SourceType } from "../types";
import { normalizeOpportunityUrl } from "../text";

const discoveryTimeoutMs = readPositiveInt("ARTIST_STUDIO_DISCOVERY_TIMEOUT_MS", 15000);

export async function fetchHtml(url: string) {
  const safeUrl = normalizePublicOpportunityUrl(url);
  const response = await fetch(safeUrl, {
    signal: AbortSignal.timeout(discoveryTimeoutMs),
    headers: {
      "User-Agent": "ArtistStudio/0.2 (+opportunity discovery)",
      "Accept": "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8"
    },
    redirect: "follow"
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

export function extractLinksFromHtml(html: string, source: { name: string; url: string; type: SourceType }, query: SearchQuery) {
  const links: SearchResult[] = [];
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorPattern.exec(html))) {
    const href = decodeHtml(match[1]);
    const label = htmlToPlainText(match[2]).slice(0, 180);
    const context = htmlToPlainText(html.slice(Math.max(0, match.index - 260), Math.min(html.length, match.index + match[0].length + 260)));
    if (!looksLikeOpportunity(label, href, context)) continue;
    try {
      const resolved = normalizeOpportunityUrl(href, source.url);
      if (!resolved.startsWith("https://")) continue;
      links.push({
        title: label || resolved,
        url: resolved,
        snippet: context.slice(0, 500),
        sourceName: source.name,
        sourceType: source.type,
        sourceUrl: source.url,
        discoveryQuery: query.query,
        discoveryLanguage: query.language,
        discoveredAt: new Date().toISOString()
      });
    } catch {
      // Ignore malformed links.
    }
  }
  return links;
}

export function htmlToPlainText(html: string) {
  return decodeHtml(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function looksLikeOpportunity(label: string, href: string, context: string) {
  const text = `${label} ${href} ${context}`.toLowerCase();
  return [
    "open call",
    "residency",
    "artist residency",
    "exhibition",
    "grant",
    "fellowship",
    "opportunity",
    "apply",
    "deadline",
    "call for artists",
    "公募",
    "募集",
    "公开征集",
    "招募",
    "공모",
    "레지던시"
  ].some((keyword) => text.includes(keyword))
    && !/\b(login|sign in|privacy|terms|cookie|facebook|instagram|linkedin|twitter|x\.com|youtube)\b/i.test(text);
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function readPositiveInt(name: string, fallback: number) {
  const value = Number(process.env[name] || "");
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
