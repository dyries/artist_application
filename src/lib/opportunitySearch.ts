import { recordOpportunityDiscoveryRun, upsertOpportunity } from "./db";
import { runOpportunityDiscovery } from "./opportunityDiscovery";
import type { ArtistProfile, AutomationRunMode } from "@/types/domain";
import type { ScoredCandidate, ShortlistedCandidate } from "./opportunityDiscovery";

const discoverySourceEnvName = "ARTIST_STUDIO_DISCOVERY_SOURCE_URLS";
const discoverySourceLabel = "discovered-opportunity-search";

export async function discoverOpportunityCandidates(profile: ArtistProfile, runMode: AutomationRunMode) {
  const discovery = await runOpportunityDiscovery(profile, runMode);
  if (runMode === "real") {
    const shortlistedUrls = new Set(discovery.discovered.map((candidate) => candidate.url));
    const toPersist = discovery.candidatesForVerification.slice(0, discovery.plan.limits.verificationCandidateLimit);
    for (const candidate of toPersist) {
      upsertOpportunity(candidateToOpportunity(candidate, shortlistedUrls.has(candidate.url)));
    }
    recordOpportunityDiscoveryRun({
      runMode,
      profile: discovery.plan.profile,
      limits: discovery.plan.limits,
      queries: discovery.queries,
      candidates: discovery.candidatesForVerification,
      shortlist: discovery.discovered,
      coverage: discovery.coverage
    });
  }
  return discovery;
}

function candidateToOpportunity(candidate: ScoredCandidate, shortlisted: boolean) {
  return {
    title: candidate.title || candidate.url,
    organization: candidate.organization || candidate.sourceName || "",
    url: candidate.url,
    location: candidate.location || candidate.country || "",
    deadline: candidate.deadline || "",
    fee: candidate.applicationFee || "",
    funding: [candidate.stipend, candidate.productionBudget, candidate.accommodation, candidate.travelSupport, candidate.awardAmount].filter(Boolean).join("; "),
    eligibility: candidate.eligibility || candidate.eligibleNationalities.join(", "),
    materials: candidate.requiredMaterials.join(", "),
    submissionMethod: candidate.applicationUrl ? "web_form" as const : "unknown" as const,
    summary: renderCandidateSummary(candidate, shortlisted),
    score: candidate.scoreBreakdown.total,
    risks: renderCandidateRisks(candidate),
    status: shortlisted ? "recommended" as const : "new" as const,
    source: `${discoverySourceLabel}:${candidate.sourceType}:${candidate.sourceName}:${discoverySourceEnvName}`,
    rawContent: ""
  };
}

function renderCandidateSummary(candidate: ScoredCandidate, shortlisted: boolean) {
  const shortlistNote = shortlisted ? "Recommended for the first opportunity review shortlist." : "Kept as a verified discovery candidate outside the final shortlist.";
  return [
    shortlistNote,
    `Type: ${candidate.opportunityType}.`,
    `Discovery query: ${candidate.discoveryQuery || "not recorded"}.`,
    `Verification status: ${candidate.verificationStatus}.`,
    `Recommendation rationale: ${candidate.scoreBreakdown.reasons.join(" ")}`
  ].join(" ");
}

function renderCandidateRisks(candidate: ScoredCandidate) {
  return [
    ...candidate.scoreBreakdown.risks,
    ...candidate.scoreBreakdown.missingInformation.map((item) => `Missing: ${item}`),
    `Triage: ${candidate.triageStatus} (${candidate.triageReasons.join("; ")})`,
    candidate.deadlineTimezone === "unknown" && candidate.deadline ? "Deadline timezone unknown; verify before submission." : ""
  ].filter(Boolean).join("\n");
}

export function renderCandidateRawContent(candidate: ScoredCandidate | ShortlistedCandidate) {
  return [
    `Source: ${candidate.sourceName} (${candidate.sourceType})`,
    `Source URL: ${candidate.sourceUrl || ""}`,
    `Canonical URL: ${candidate.canonicalUrl}`,
    `Official URL: ${candidate.officialUrl}`,
    `Application URL: ${candidate.applicationUrl || ""}`,
    `Discovery query: ${candidate.discoveryQuery || ""}`,
    `Discovery language: ${candidate.discoveryLanguage || ""}`,
    `Deadline: ${candidate.deadline || "not confirmed"}`,
    `Fee: ${candidate.applicationFee || "not confirmed"}`,
    `Funding: ${[candidate.stipend, candidate.productionBudget, candidate.accommodation, candidate.travelSupport].filter(Boolean).join("; ") || "not confirmed"}`,
    `Eligibility: ${candidate.eligibility || "not confirmed"}`,
    `Required materials: ${candidate.requiredMaterials.join(", ") || "not confirmed"}`,
    `Score JSON: ${JSON.stringify(candidate.scoreBreakdown)}`,
    "",
    candidate.snippet || ""
  ].join("\n");
}
