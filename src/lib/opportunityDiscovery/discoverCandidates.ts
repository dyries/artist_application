import { readOpportunityQueryCache, recordOpportunityQueryCache } from "@/lib/db";
import type { SearchPlan, SearchProvider, SearchQuery, ProviderRunResult, SearchResult } from "./types";

const queryCacheTtlHours = readPositiveInt("ARTIST_STUDIO_DISCOVERY_QUERY_CACHE_TTL_HOURS", 12);

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
        const cached = readOpportunityQueryCache(provider.name, query.query);
        const results = cached && cacheFresh(cached.fetchedAt)
          ? (cached.results as SearchResult[]).slice(0, plan.limits.maxResultsPerQuery)
          : (await provider.search(query, plan)).slice(0, plan.limits.maxResultsPerQuery);
        if (!cached || !cacheFresh(cached.fetchedAt)) {
          recordOpportunityQueryCache({ provider: provider.name, query: query.query, results, status: "ok" });
        }
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

function cacheFresh(fetchedAt: string) {
  const timestamp = Date.parse(fetchedAt);
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp < queryCacheTtlHours * 60 * 60 * 1000;
}

function queriesForProvider(queries: SearchQuery[], providerName: string) {
  if (providerName === "manual-sources") {
    return queries.slice(0, 1);
  }
  if (providerName === "curated-boards" || providerName === "institution-sites") {
    return queries.slice(0, 4);
  }
  return queries;
}

function readPositiveInt(name: string, fallback: number) {
  const value = Number(process.env[name] || "");
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
