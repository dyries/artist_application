import type { SearchPlan, TriagedCandidate, VerifiedCandidate } from "./types";

export function verifyCandidates(candidates: TriagedCandidate[], plan: SearchPlan, now = new Date()): VerifiedCandidate[] {
  return candidates.map((candidate) => {
    const text = `${candidate.title}\n${candidate.snippet || ""}`;
    const deadline = inferDeadline(text);
    const expired = deadline ? Date.parse(`${deadline}T23:59:59Z`) < now.getTime() : false;
    const opportunityType = inferOpportunityType(text, candidate.discoveryQuery || "");
    const organization = inferOrganization(candidate);
    const fee = inferFee(text);
    const eligibility = inferEligibility(text);
    const sourceReliability = candidate.isOfficialSource ? 88 : candidate.sourceType === "web_search" ? 65 : 58;

    return {
      ...candidate,
      officialUrl: candidate.officialSourceUrl || candidate.url,
      applicationUrl: /\bapply|application|submit|申请|応募|지원/i.test(candidate.url) ? candidate.url : undefined,
      organization,
      opportunityType,
      location: inferLocation(text, plan.targetRegions),
      country: "",
      onlineOrOnsite: /\bonline|virtual|remote\b/i.test(text) ? "online" : "unknown",
      deadline: deadline || "",
      deadlineTimezone: deadline ? "unknown" : "",
      deadlineConfidence: deadline ? "medium" : "unknown",
      applicationFee: fee,
      currency: inferCurrency(fee),
      eligibility,
      eligibleNationalities: /international|worldwide|global|不限国籍|国际/i.test(text) ? ["international"] : [],
      eligibleResidencies: [],
      ageRequirement: "",
      studentRequirement: /student/i.test(text) ? "student language present; verify exact requirement" : "",
      mediumRequirements: plan.profile.mediums.filter((medium) => text.toLowerCase().includes(medium.toLowerCase())),
      requiredMaterials: inferRequiredMaterials(text),
      programmeDates: "",
      duration: "",
      accommodation: /accommodation|housing|住宿/i.test(text) ? "accommodation mentioned; verify details" : "",
      travelSupport: /travel|flight|交通|旅費/i.test(text) ? "travel support or travel requirement mentioned; verify details" : "",
      productionBudget: /production budget|production grant|制作费|製作/i.test(text) ? "production support mentioned; verify details" : "",
      stipend: /stipend|honorarium|per diem|生活费/i.test(text) ? "stipend/honorarium mentioned; verify amount" : "",
      awardAmount: /award|prize|奖金|賞/i.test(text) ? "award language present; verify amount" : "",
      selectionProcess: "",
      sourceReliability,
      verificationStatus: expired ? "expired" : candidate.triageStatus === "keep" && deadline ? "partially_verified" : "unverified",
      verifiedAt: now.toISOString(),
      conflicts: []
    };
  });
}

function inferDeadline(text: string) {
  const iso = text.match(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const month = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(20\d{2})\b/i);
  if (month) {
    const date = new Date(`${month[1]} ${month[2]}, ${month[3]} UTC`);
    if (Number.isFinite(date.getTime())) return date.toISOString().slice(0, 10);
  }
  return "";
}

function inferOpportunityType(text: string, fallback: string) {
  if (/residency|驻留|レジデンス|레지던시/i.test(text)) return "artist residency";
  if (/grant|fellowship|助成|지원/i.test(text)) return "grant/fellowship";
  if (/commission|public art/i.test(text)) return "commission";
  if (/exhibition|展览|展示|전시/i.test(text)) return "exhibition open call";
  return fallback || "opportunity";
}

function inferOrganization(candidate: TriagedCandidate) {
  return candidate.sourceType === "institution_site" ? candidate.sourceName : "";
}

function inferFee(text: string) {
  const fee = text.match(/(?:fee|application fee|报名费|参加費|수수료)[^\n.。]{0,80}/i);
  return fee?.[0].trim() || "";
}

function inferCurrency(text: string) {
  if (/\$|usd/i.test(text)) return "USD";
  if (/€|eur/i.test(text)) return "EUR";
  if (/£|gbp/i.test(text)) return "GBP";
  if (/¥|jpy|円/i.test(text)) return "JPY";
  return "";
}

function inferEligibility(text: string) {
  const eligibility = text.match(/(?:eligibility|eligible|who can apply|applicants|资格|応募資格|지원 자격)[^\n.。]{0,180}/i);
  return eligibility?.[0].trim() || "";
}

function inferLocation(text: string, regions: string[]) {
  return regions.find((region) => region !== "worldwide" && text.toLowerCase().includes(region.toLowerCase())) || "";
}

function inferRequiredMaterials(text: string) {
  return ["CV", "portfolio", "artist statement", "proposal"].filter((item) => text.toLowerCase().includes(item.toLowerCase()));
}
