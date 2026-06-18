import type { SearchPlan, SearchProvider, SearchQuery, SearchResult } from "../types";

export function webSearchProvider(): SearchProvider {
  return {
    name: "configured-web-search",
    type: "web_search",
    isAvailable: () => Boolean(process.env.ARTIST_STUDIO_WEB_SEARCH_ENDPOINT),
    unavailableReason: () => "ARTIST_STUDIO_WEB_SEARCH_ENDPOINT is not configured.",
    async search(query: SearchQuery, plan: SearchPlan) {
      const endpoint = process.env.ARTIST_STUDIO_WEB_SEARCH_ENDPOINT;
      if (!endpoint) return [];
      const url = new URL(endpoint);
      url.searchParams.set("q", query.query);
      url.searchParams.set("limit", String(plan.limits.maxResultsPerQuery));
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        headers: {
          "Accept": "application/json",
          ...(process.env.ARTIST_STUDIO_WEB_SEARCH_TOKEN ? { "Authorization": `Bearer ${process.env.ARTIST_STUDIO_WEB_SEARCH_TOKEN}` } : {})
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json() as { results?: Array<{ title?: string; url?: string; snippet?: string; source?: string }> };
      return (data.results || [])
        .filter((item) => item.url)
        .map((item): SearchResult => ({
          title: item.title || item.url || query.query,
          url: item.url || "",
          snippet: item.snippet || "",
          sourceName: item.source || "configured web search",
          sourceType: "web_search",
          discoveryQuery: query.query,
          discoveryLanguage: query.language,
          discoveredAt: new Date().toISOString()
        }));
    }
  };
}
