import type { SearchPlan, SearchProvider, SearchQuery, SearchResult } from "../types";

export function manualSourcesProvider(manualResults: SearchResult[]): SearchProvider {
  return {
    name: "manual-sources",
    type: "manual",
    isAvailable: () => manualResults.length > 0,
    unavailableReason: () => "No user-provided opportunity links are pending discovery.",
    async search(query: SearchQuery, plan: SearchPlan) {
      return manualResults
        .map((result) => ({
          ...result,
          discoveryQuery: result.discoveryQuery || query.query,
          discoveryLanguage: result.discoveryLanguage || query.language
        }))
        .slice(0, plan.limits.maxResultsPerQuery);
    }
  };
}
