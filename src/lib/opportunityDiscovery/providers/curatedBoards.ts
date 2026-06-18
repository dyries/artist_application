import { configuredSources } from "../sourceRegistry";
import type { SearchPlan, SearchProvider, SearchQuery } from "../types";
import { extractLinksFromHtml, fetchHtml } from "./common";

export function curatedBoardsProvider(): SearchProvider {
  return {
    name: "curated-boards",
    type: "curated_board",
    isAvailable: () => true,
    async search(query: SearchQuery, plan: SearchPlan) {
      const sources = configuredSources()
        .filter((source) => source.region === "configured" || source.region === "worldwide" || plan.targetRegions.includes(source.region) || plan.targetRegions.includes("worldwide"))
        .slice(0, Math.max(1, Math.min(12, plan.limits.maxResultsPerQuery)));
      const results = [];
      for (const source of sources) {
        const html = await fetchHtml(source.url);
        results.push(...extractLinksFromHtml(html, source, query).slice(0, plan.limits.maxResultsPerQuery));
      }
      return results;
    }
  };
}
