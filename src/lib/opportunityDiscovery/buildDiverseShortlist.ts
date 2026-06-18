import type { SearchPlan, ScoredCandidate, ShortlistedCandidate } from "./types";

export function buildDiverseShortlist(candidates: ScoredCandidate[], plan: SearchPlan): ShortlistedCandidate[] {
  const chosen: ScoredCandidate[] = [];
  const sorted = candidates
    .filter((candidate) => candidate.verificationStatus !== "expired")
    .filter((candidate) => candidate.scoreBreakdown.eligibilityFit > 0)
    .sort((left, right) => right.scoreBreakdown.total - left.scoreBreakdown.total);

  for (const candidate of sorted) {
    if (chosen.length >= plan.limits.shortlistLimit) break;
    if (chosen.length >= 2 && chosen.filter((item) => item.sourceName === candidate.sourceName).length >= 2) continue;
    if (chosen.length >= 3 && chosen.filter((item) => item.opportunityType === candidate.opportunityType).length >= 2) continue;
    chosen.push(candidate);
  }
  for (const candidate of sorted) {
    if (chosen.length >= plan.limits.shortlistLimit) break;
    if (chosen.some((item) => item.url === candidate.url)) continue;
    const sameSourceCount = chosen.filter((item) => item.sourceName === candidate.sourceName).length;
    const hasAlternativeSources = sorted.some((item) => !chosen.some((chosenItem) => chosenItem.url === item.url) && chosen.filter((chosenItem) => chosenItem.sourceName === item.sourceName).length < 2);
    if (sameSourceCount >= 2 && hasAlternativeSources) continue;
    chosen.push(candidate);
  }
  return chosen.map((candidate) => ({
    ...candidate,
    recommendationReason: candidate.scoreBreakdown.reasons.join(" "),
    keyStrengths: candidate.scoreBreakdown.reasons.filter((reason) => !/weak/i.test(reason)).slice(0, 3),
    eligibilityRisks: candidate.scoreBreakdown.risks.filter((risk) => /eligibility|fee|deadline/i.test(risk)),
    deadlineStatus: candidate.deadline ? `Deadline identified as ${candidate.deadline}; timezone ${candidate.deadlineTimezone || "unknown"}.` : "Deadline not confirmed.",
    applicationEffort: candidate.requiredMaterials.length ? `Likely materials: ${candidate.requiredMaterials.join(", ")}.` : "Application materials not confirmed.",
    fundingSummary: [candidate.applicationFee, candidate.stipend, candidate.productionBudget, candidate.accommodation, candidate.travelSupport].filter(Boolean).join(" / ") || "Funding and fee details not confirmed.",
    sourceConfidence: `${candidate.verificationStatus}; source reliability ${candidate.sourceReliability}/100.`
  }));
}
