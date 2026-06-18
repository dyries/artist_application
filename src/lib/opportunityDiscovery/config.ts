import type { OpportunityDiscoveryLimits } from "./types";

export function readDiscoveryLimits(): OpportunityDiscoveryLimits {
  const limits = {
    maxQueriesPerRun: readPositiveInt("ARTIST_STUDIO_MAX_SEARCH_QUERIES", 30),
    maxResultsPerQuery: readPositiveInt("ARTIST_STUDIO_MAX_RESULTS_PER_QUERY", 20),
    discoveryCandidateLimit: readPositiveInt("ARTIST_STUDIO_DISCOVERY_CANDIDATE_LIMIT", 200),
    triageCandidateLimit: readPositiveInt("ARTIST_STUDIO_TRIAGE_CANDIDATE_LIMIT", 60),
    verificationCandidateLimit: readPositiveInt("ARTIST_STUDIO_VERIFICATION_CANDIDATE_LIMIT", 30),
    shortlistLimit: readPositiveInt("ARTIST_STUDIO_SHORTLIST_LIMIT", 5),
    applicationPreparationLimit: readPositiveInt("ARTIST_STUDIO_APPLICATION_PREPARATION_LIMIT", 5)
  };
  return enforceLimitOrder(limits);
}

function enforceLimitOrder(input: OpportunityDiscoveryLimits): OpportunityDiscoveryLimits {
  const shortlistLimit = Math.max(1, input.shortlistLimit);
  const verificationCandidateLimit = Math.max(shortlistLimit + 1, input.verificationCandidateLimit);
  const triageCandidateLimit = Math.max(verificationCandidateLimit + 1, input.triageCandidateLimit);
  const discoveryCandidateLimit = Math.max(triageCandidateLimit + 1, input.discoveryCandidateLimit);
  return {
    ...input,
    shortlistLimit,
    verificationCandidateLimit,
    triageCandidateLimit,
    discoveryCandidateLimit,
    applicationPreparationLimit: Math.max(1, input.applicationPreparationLimit)
  };
}

function readPositiveInt(name: string, fallback: number) {
  const value = Number(process.env[name] || "");
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
