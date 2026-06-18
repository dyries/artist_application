import type { SearchPlan, SearchProvider, SearchQuery, ProviderRunResult, SearchResult } from "./types";

export async function discoverCandidates(plan: SearchPlan, queries: SearchQuery[], providers: SearchProvider[]) {
  const providerResults: ProviderRunResult[] = [];
  const discovered: SearchResult[] = [];
  for (const provider of providers) {
    if (!provider.isAvailable()) {
      providerResults.push({
        provider: provider.name,
        ok: false,
        results: [],
        error: provider.unavailableReason?.() || "Provider is not configured."
      });
      continue;
    }
    for (const query of queriesForProvider(queries, provider.name)) {
      try {
        const results = (await provider.search(query, plan)).slice(0, plan.limits.maxResultsPerQuery);
        providerResults.push({ provider: provider.name, ok: true, results });
        discovered.push(...results);
      } catch (error) {
        providerResults.push({
          provider: provider.name,
          ok: false,
          results: [],
          error: error instanceof Error ? error.message : String(error)
        });
      }
      if (discovered.length >= plan.limits.discoveryCandidateLimit) break;
    }
    if (discovered.length >= plan.limits.discoveryCandidateLimit) break;
  }
  return {
    providerResults,
    discovered: discovered.slice(0, plan.limits.discoveryCandidateLimit)
  };
}

function queriesForProvider(queries: SearchQuery[], providerName: string) {
  if (providerName === "curated-boards" || providerName === "institution-sites") {
    return queries.slice(0, 4);
  }
  return queries;
}
