import type { ArtistSearchProfile, OpportunityScore, ScoredCandidate, VerifiedCandidate } from "./types";
import { clampScore, deadlineTimestamp, textIncludesAny } from "./text";

export function scoreCandidates(candidates: VerifiedCandidate[], profile: ArtistSearchProfile, now = new Date()): ScoredCandidate[] {
  return candidates.map((candidate) => {
    const text = `${candidate.title} ${candidate.snippet || ""} ${candidate.eligibility}`.toLowerCase();
    const mediumFit = fitScore(text, profile.mediums, 12, 4);
    const themeFit = fitScore(text, profile.themes, 12, 5);
    const practiceFit = fitScore(text, profile.methods, 10, 5);
    const eligibilityFit = eligibilityScore(text, profile);
    const deadlineFeasibility = deadlineScore(candidate.deadline, now);
    const fundingFit = fundingScore(text, profile);
    const locationFit = locationScore(text, profile.preferredRegions);
    const sourceReliability = Math.round(candidate.sourceReliability);
    const careerStageFit = /emerging|early career|mid-career|professional/i.test(text) ? 8 : 5;
    const applicationEffort = candidate.requiredMaterials.length >= 4 ? 5 : 8;
    const strategicValue = strategicScore(text);
    const risks: string[] = [];
    const missingInformation: string[] = [];
    if (eligibilityFit < 20) risks.push("Eligibility may not fit the artist profile.");
    if (!candidate.deadline) missingInformation.push("Deadline not confirmed.");
    if (!candidate.applicationFee && profile.fundingPreferences.acceptsApplicationFees === false) missingInformation.push("Fee status not confirmed.");
    if (deadlineFeasibility === 0) risks.push("Deadline appears expired.");
    if (candidate.verificationStatus === "unverified") risks.push("Source information is incomplete and requires further verification.");

    const total = clampScore(
      practiceFit + themeFit + mediumFit + eligibilityFit + careerStageFit + fundingFit + locationFit
      + deadlineFeasibility + sourceReliability * 0.12 + applicationEffort + strategicValue
    );
    const scoreBreakdown: OpportunityScore = {
      total: eligibilityFit === 0 || deadlineFeasibility === 0 ? Math.min(total, 45) : total,
      practiceFit,
      themeFit,
      mediumFit,
      eligibilityFit,
      careerStageFit,
      fundingFit,
      locationFit,
      deadlineFeasibility,
      sourceReliability,
      applicationEffort,
      strategicValue,
      reasons: [
        mediumFit > 5 ? "Medium match found in candidate text." : "Medium match is weak or missing.",
        themeFit > 5 ? "Theme match found in candidate text." : "Theme match is weak or missing.",
        `${candidate.sourceName} source reliability scored separately.`
      ],
      risks,
      missingInformation
    };
    return { ...candidate, scoreBreakdown };
  }).sort((left, right) => right.scoreBreakdown.total - left.scoreBreakdown.total);
}

function fitScore(text: string, terms: string[], strong: number, fallback: number) {
  return textIncludesAny(text, terms) ? strong : fallback;
}

function eligibilityScore(text: string, profile: ArtistSearchProfile) {
  if (/\b(u\.?s\.? citizens? only|u\.?s\.? residents? only|uk residents? only)\b/i.test(text)) return 0;
  if (/international|worldwide|global|不限国籍|all nationalities/i.test(text)) return 18;
  if (profile.eligibility.residenceCountry && text.includes(profile.eligibility.residenceCountry.toLowerCase())) return 18;
  return 10;
}

function deadlineScore(deadline: string, now: Date) {
  if (!deadline) return 6;
  const timestamp = deadlineTimestamp(deadline);
  if (timestamp < now.getTime()) return 0;
  const days = Math.round((timestamp - now.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 7) return 5;
  if (days < 21) return 9;
  return 12;
}

function fundingScore(text: string, profile: ArtistSearchProfile) {
  if (/stipend|production budget|travel support|accommodation|grant|资助|지원/i.test(text)) return 12;
  if (profile.fundingPreferences.acceptsApplicationFees === false && /fee|participation/i.test(text)) return 2;
  return 7;
}

function locationScore(text: string, regions: string[]) {
  if (regions.includes("worldwide") || /international|global|online/i.test(text)) return 8;
  return textIncludesAny(text, regions) ? 8 : 5;
}

function strategicScore(text: string) {
  if (/museum|biennial|foundation|university|research|commission|美术馆|双年展|大学/i.test(text)) return 10;
  return 6;
}
