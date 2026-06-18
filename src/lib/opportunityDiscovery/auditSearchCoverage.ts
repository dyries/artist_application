import type { ProviderRunResult, SearchCoverageReport, SearchPlan, SearchQuery, ShortlistedCandidate, TriagedCandidate, NormalizedCandidate, DedupedCandidate, ScoredCandidate } from "./types";

export function auditSearchCoverage(input: {
  plan: SearchPlan;
  queries: SearchQuery[];
  providerResults: ProviderRunResult[];
  normalized: NormalizedCandidate[];
  deduped: DedupedCandidate[];
  triaged: TriagedCandidate[];
  verified: ScoredCandidate[];
  shortlisted: ShortlistedCandidate[];
}): SearchCoverageReport {
  const executedQueries = new Set(input.providerResults.flatMap((result) => result.results.map((item) => item.discoveryQuery).filter(Boolean))).size;
  const succeeded = input.providerResults.filter((result) => result.ok && result.results.length > 0).map((result) => result.provider);
  const failed = input.providerResults
    .filter((result) => !result.ok || result.error)
    .map((result) => ({ provider: result.provider, reason: result.error || "No results returned." }));
  const languageWithResults = new Set(input.providerResults.flatMap((result) => result.results.map((item) => item.discoveryLanguage).filter(Boolean)));
  const budgetTruncated = input.normalized.length >= input.plan.limits.discoveryCandidateLimit
    || input.triaged.length >= input.plan.limits.triageCandidateLimit
    || input.verified.length >= input.plan.limits.verificationCandidateLimit;
  const fixedSourceOnly = !succeeded.some((provider) => /web-search|rss/i.test(provider));
  const report: SearchCoverageReport = {
    generatedQueries: input.queries.length,
    executedQueries,
    queriesByLanguage: countBy(input.queries, "language"),
    queriesByRegion: countBy(input.queries, "region"),
    queriesByOpportunityType: countBy(input.queries, "opportunityType"),
    providersAttempted: [...new Set(input.providerResults.map((result) => result.provider))],
    providersSucceeded: [...new Set(succeeded)],
    providersFailed: failed,
    discoveredCount: input.providerResults.reduce((sum, result) => sum + result.results.length, 0),
    normalizedCount: input.normalized.length,
    deduplicatedCount: input.deduped.length,
    triagedCount: input.triaged.length,
    triageKeepCount: input.triaged.filter((item) => item.triageStatus === "keep").length,
    triageRejectedCount: input.triaged.filter((item) => item.triageStatus === "reject").length,
    triageUncertainCount: input.triaged.filter((item) => item.triageStatus === "uncertain").length,
    verifiedCount: input.verified.length,
    shortlistedCount: input.shortlisted.length,
    uncoveredRegions: input.plan.targetRegions.filter((region) => !input.queries.some((query) => query.region === region)),
    uncoveredOpportunityTypes: input.plan.targetOpportunityTypes.filter((type) => !input.queries.some((query) => query.opportunityType === type)),
    unexecutedLanguages: input.plan.targetLanguages.filter((language) => !languageWithResults.has(language)),
    budgetTruncated,
    fixedSourceOnly,
    confidence: fixedSourceOnly || failed.length > 0 ? "low" : budgetTruncated ? "medium" : "high",
    warnings: [
      ...input.plan.queryBudgetWarnings,
      fixedSourceOnly ? "Search relied on fixed/curated sources because no configured web search or RSS provider returned results." : "",
      budgetTruncated ? "Search was truncated by one or more configured discovery budgets." : "",
      input.shortlisted.length < input.plan.limits.shortlistLimit ? "Shortlist has fewer recommendations than requested." : ""
    ].filter(Boolean)
  };
  return report;
}

function countBy<T extends Record<string, unknown>>(items: T[], key: keyof T) {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const value = String(item[key] || "unknown");
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}
