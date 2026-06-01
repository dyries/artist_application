import { mapWithConcurrency } from "./concurrency";
import { upsertOpportunity } from "./db";
import { normalizePublicOpportunityUrl } from "./urlSecurity";
import type { ArtistProfile, AutomationRunMode } from "@/types/domain";

type DiscoveryResult = {
  sourceUrl: string;
  ok: boolean;
  discovered: DiscoveredOpportunityLink[];
  error?: string;
};

type DiscoveredOpportunityLink = {
  title: string;
  url: string;
  sourceUrl: string;
};

const defaultDiscoverySources = [
  "https://www.artconnect.com/opportunities",
  "https://www.transartists.org/en/calls",
  "https://resartis.org/open-calls/",
  "https://www.nyfa.org/opportunities/",
  "https://www.callforentry.org/",
  "https://www.curatorspace.com/opportunities",
  "https://artenda.net/open-calls/",
  "https://www.artquest.org.uk/opportunities/"
];

const discoveryKeywords = [
  "open call",
  "residency",
  "artist residency",
  "exhibition",
  "grant",
  "fellowship",
  "opportunity",
  "apply",
  "deadline",
  "call for artists"
];

const maxDiscoverySources = readPositiveInt("ARTIST_STUDIO_DISCOVERY_SOURCES", 8);
const maxDiscoveredLinks = readPositiveInt("ARTIST_STUDIO_DISCOVERY_LINKS", 80);
const discoveryTimeoutMs = readPositiveInt("ARTIST_STUDIO_DISCOVERY_TIMEOUT_MS", 15000);
const discoveryConcurrency = readPositiveInt("ARTIST_STUDIO_DISCOVERY_CONCURRENCY", 3);

export async function discoverOpportunityCandidates(profile: ArtistProfile, runMode: AutomationRunMode) {
  const sourceUrls = readDiscoverySources().slice(0, maxDiscoverySources);
  const results = await mapWithConcurrency(sourceUrls, discoveryConcurrency, async (sourceUrl) => discoverFromSource(sourceUrl));
  const discovered = dedupeDiscoveredLinks(results.flatMap((result) => result.discovered)).slice(0, maxDiscoveredLinks);

  if (runMode === "real") {
    for (const link of discovered) {
      upsertOpportunity({
        title: link.title || link.url,
        url: link.url,
        source: "discovered-opportunity-search",
        status: "new",
        summary: renderDiscoverySummary(profile, link),
        risks: "Discovered from a public opportunity source. Must verify source URL, deadline, eligibility, fees, funding, required materials, and submission method before recommendation."
      });
    }
  }

  return { sourceUrls, results, discovered, runMode };
}

async function discoverFromSource(sourceUrl: string): Promise<DiscoveryResult> {
  try {
    const url = normalizePublicOpportunityUrl(sourceUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), discoveryTimeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "ArtistStudio/0.1 (+global opportunity discovery)",
          "Accept": "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8"
        },
        redirect: "follow"
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      return {
        sourceUrl: url,
        ok: true,
        discovered: extractOpportunityLinks(html, url)
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    return {
      sourceUrl,
      ok: false,
      discovered: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function extractOpportunityLinks(html: string, baseUrl: string) {
  const links: DiscoveredOpportunityLink[] = [];
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorPattern.exec(html))) {
    const href = decodeHtml(match[1]);
    const label = htmlToPlainText(match[2]).slice(0, 180);
    const context = htmlToPlainText(html.slice(Math.max(0, match.index - 240), Math.min(html.length, match.index + match[0].length + 240)));
    if (!looksLikeOpportunity(label, href, context)) continue;
    const normalized = normalizeDiscoveredUrl(href, baseUrl);
    if (!normalized) continue;
    links.push({ title: label || normalized, url: normalized, sourceUrl: baseUrl });
  }
  return links;
}

function looksLikeOpportunity(label: string, href: string, context: string) {
  const text = `${label} ${href} ${context}`.toLowerCase();
  return discoveryKeywords.some((keyword) => text.includes(keyword))
    && !/\b(login|sign in|privacy|terms|cookie|facebook|instagram|linkedin|twitter|x\.com|youtube)\b/i.test(text);
}

function normalizeDiscoveredUrl(href: string, baseUrl: string) {
  try {
    const resolved = new URL(href, baseUrl);
    resolved.hash = "";
    if (resolved.protocol !== "https:") return null;
    return normalizePublicOpportunityUrl(resolved.toString());
  } catch {
    return null;
  }
}

function dedupeDiscoveredLinks(links: DiscoveredOpportunityLink[]) {
  const seen = new Set<string>();
  const output: DiscoveredOpportunityLink[] = [];
  for (const link of links) {
    if (seen.has(link.url)) continue;
    seen.add(link.url);
    output.push(link);
  }
  return output;
}

function readDiscoverySources() {
  const fromEnv = (process.env.ARTIST_STUDIO_DISCOVERY_SOURCE_URLS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return fromEnv.length > 0 ? fromEnv : defaultDiscoverySources;
}

function renderDiscoverySummary(profile: ArtistProfile, link: DiscoveredOpportunityLink) {
  return [
    "Public opportunity candidate discovered by project automation.",
    `Artist region preference: ${profile.applicationRegion || "worldwide"}.`,
    `Source board: ${link.sourceUrl}.`,
    "Awaiting verification and Chinese recommendation before user selection."
  ].join(" ");
}

function htmlToPlainText(html: string) {
  return decodeHtml(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function decodeHtml(value: string) {
  return value
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
