import type { ArtistProfile, AutomationRunMode, Opportunity } from "@/types/domain";
import { buildSearchPlan } from "./buildSearchPlan";
import { generateSearchQueries } from "./generateSearchQueries";
import { defaultSearchProviders } from "./providers";
import { discoverCandidates } from "./discoverCandidates";
import { normalizeCandidates } from "./normalizeCandidate";
import { deduplicateCandidates } from "./deduplicateCandidates";
import { triageCandidates } from "./triageCandidates";
import { fetchCandidateEvidence } from "./fetchCandidateEvidence";
import { verifyCandidates } from "./verifyCandidates";
import { scoreCandidates } from "./scoreCandidates";
import { buildDiverseShortlist } from "./buildDiverseShortlist";
import { auditSearchCoverage } from "./auditSearchCoverage";
import type { DiscoveryRunResult } from "./types";

export async function runOpportunityDiscovery(profile: ArtistProfile, runMode: AutomationRunMode, existingOpportunities: Opportunity[] = []): Promise<DiscoveryRunResult> {
  const plan = buildSearchPlan(profile);
  const queries = generateSearchQueries(plan);
  const { providerResults, discovered } = await discoverCandidates(plan, queries, defaultSearchProviders(manualSearchResults(existingOpportunities)));
  const normalized = normalizeCandidates(discovered).slice(0, plan.limits.discoveryCandidateLimit);
  const deduped = deduplicateCandidates(normalized);
  const triaged = triageCandidates(deduped, plan.profile)
    .sort((left, right) => triagePriority(right.triageStatus) - triagePriority(left.triageStatus))
    .slice(0, plan.limits.triageCandidateLimit);
  const verificationPool = triaged
    .filter((candidate) => candidate.triageStatus !== "reject")
    .slice(0, plan.limits.verificationCandidateLimit);
  const evidenceByUrl = runMode === "mock" ? new Map() : await fetchCandidateEvidence(verificationPool);
  const verified = verifyCandidates(verificationPool, plan, new Date(), evidenceByUrl);
  const scored = scoreCandidates(verified, plan.profile);
  const shortlisted = buildDiverseShortlist(scored, plan);
  const coverage = auditSearchCoverage({
    plan,
    queries,
    providerResults,
    normalized,
    deduped,
    triaged,
    verified: scored,
    shortlisted
  });
  return {
    sourceUrls: Array.from(new Set(discovered.map((item) => item.sourceUrl || item.sourceName).filter(Boolean))),
    results: providerResults,
    discovered: shortlisted,
    candidatesForVerification: scored,
    coverage,
    plan,
    queries,
    runMode
  };
}

function manualSearchResults(opportunities: Opportunity[]) {
  return opportunities
    .filter((opportunity) => opportunity.source === "user-provided-link")
    .filter((opportunity) => opportunity.url.startsWith("https://"))
    .map((opportunity) => ({
      title: opportunity.title || opportunity.url,
      url: opportunity.url,
      snippet: [opportunity.summary, opportunity.rawContent, opportunity.risks].filter(Boolean).join("\n").slice(0, 2000),
      sourceName: "User-provided link",
      sourceType: "manual" as const,
      sourceUrl: opportunity.url,
      discoveredAt: opportunity.createdAt || new Date().toISOString()
    }));
}

function triagePriority(status: string) {
  if (status === "keep") return 2;
  if (status === "uncertain") return 1;
  return 0;
}

export * from "./types";
export { buildSearchProfile } from "./buildSearchProfile";
export { buildSearchPlan } from "./buildSearchPlan";
export { generateSearchQueries } from "./generateSearchQueries";
export { normalizeCandidates } from "./normalizeCandidate";
export { deduplicateCandidates } from "./deduplicateCandidates";
export { triageCandidates } from "./triageCandidates";
export { verifyCandidates } from "./verifyCandidates";
export { fetchCandidateEvidence } from "./fetchCandidateEvidence";
export { scoreCandidates } from "./scoreCandidates";
export { buildDiverseShortlist } from "./buildDiverseShortlist";
export { auditSearchCoverage } from "./auditSearchCoverage";
