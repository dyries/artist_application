import { upsertOpportunity } from "./db";
import type { Opportunity } from "@/types/domain";

type PageFetchResult = {
  opportunityId: number;
  url: string;
  ok: boolean;
  title: string;
  content: string;
  error?: string;
};

const maxOpportunityPagesPerRun = 12;
const maxPageTextLength = 12000;

export async function refreshOpportunityPages(opportunities: Opportunity[]) {
  const targets = opportunities
    .filter((opportunity) => opportunity.url.startsWith("http"))
    .filter((opportunity) => opportunity.source === "user-provided-link" || opportunity.rawContent.trim().length === 0)
    .slice(0, maxOpportunityPagesPerRun);

  const results: PageFetchResult[] = [];
  for (const opportunity of targets) {
    const result = await fetchOpportunityPage(opportunity);
    results.push(result);
    upsertOpportunity({
      ...opportunity,
      title: result.title || opportunity.title || opportunity.url,
      rawContent: result.content || opportunity.rawContent,
      risks: result.ok
        ? [opportunity.risks, "Page fetched by project automation; model must still verify facts against the source text."].filter(Boolean).join("\n")
        : [opportunity.risks, `Page fetch failed: ${result.error}`].filter(Boolean).join("\n"),
      summary: result.ok
        ? opportunity.summary || "User-provided opportunity link fetched locally. Awaiting model verification."
        : opportunity.summary || "User-provided opportunity link could not be fetched locally. Codex automation may need browser verification.",
      source: opportunity.source || "user-provided-link"
    });
  }

  return results;
}

async function fetchOpportunityPage(opportunity: Opportunity): Promise<PageFetchResult> {
  try {
    const response = await fetch(opportunity.url, {
      headers: {
        "User-Agent": "ArtistStudio/0.1 (+local project automation)",
        "Accept": "text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.8"
      },
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();
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
