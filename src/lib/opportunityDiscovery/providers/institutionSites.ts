import { institutionSources } from "../sourceRegistry";
import type { SearchPlan, SearchProvider, SearchQuery } from "../types";
import { extractLinksFromHtml, fetchHtml } from "./common";

export function institutionSitesProvider(): SearchProvider {
  return {
    name: "institution-sites",
    type: "institution_site",
    isAvailable: () => true,
    async search(query: SearchQuery, plan: SearchPlan) {
      const sources = institutionSources
        .filter((source) => source.languages.includes(query.language) || source.languages.includes("en"))
        .filter((source) => plan.targetRegions.includes("worldwide") || plan.targetRegions.includes(source.region) || ["Japan", "Korea"].includes(source.region))
        .slice(0, 8);
      const results = [];
      for (const source of sources) {
        const html = await fetchHtml(source.url);
        results.push(...extractLinksFromHtml(html, source, query).slice(0, plan.limits.maxResultsPerQuery));
      }
      return results;
    }
  };
}
