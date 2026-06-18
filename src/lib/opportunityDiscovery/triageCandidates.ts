import type { ArtistSearchProfile, DedupedCandidate, TriagedCandidate } from "./types";
import { deadlineTimestamp, textIncludesAny } from "./text";

const expiredSignals = ["archive", "past event", "closed", "deadline passed", "applications closed", "已截止", "募集終了", "마감"];
const openSignals = ["open call", "apply", "application", "deadline", "residency", "grant", "fellowship", "公募", "公开征集", "招募", "募集", "공모"];
const youthSignals = ["under 18", "children", "youth only", "teen", "青少年", "儿童"];
const nonVisualSignals = ["music only", "theatre only", "dance only", "performing arts only"];

export function triageCandidates(candidates: DedupedCandidate[], profile: ArtistSearchProfile, now = new Date()): TriagedCandidate[] {
  return candidates.map((candidate) => {
    const text = `${candidate.title} ${candidate.url} ${candidate.snippet || ""}`.toLowerCase();
    const reasons: string[] = [];
    let status: TriagedCandidate["triageStatus"] = "keep";

    if (textIncludesAny(text, expiredSignals) || deadlineTimestamp(text) < now.getTime()) {
      status = "reject";
      reasons.push("Candidate appears expired or archived.");
    }
    if (textIncludesAny(text, youthSignals)) {
      status = "reject";
      reasons.push("Candidate appears limited to youth/children.");
    }
    if (textIncludesAny(text, nonVisualSignals)) {
      status = "reject";
      reasons.push("Candidate appears outside visual/contemporary art practice.");
    }
    if (!textIncludesAny(text, openSignals)) {
      status = status === "reject" ? status : "uncertain";
      reasons.push("No clear open application signal found in low-cost text.");
    }
    if (profile.fundingPreferences.acceptsApplicationFees === false && /\b(pay[- ]to[- ]show|booth fee|wall fee|participation fee)\b/i.test(text)) {
      status = "reject";
      reasons.push("Fee language conflicts with conservative funding preference.");
    }
    if (/\b(u\.?s\.? citizens? only|u\.?s\.? residents? only|uk residents? only)\b/i.test(text)) {
      status = "reject";
      reasons.push("Eligibility appears geographically restricted.");
    }
    if (status === "keep") reasons.push("Low-cost triage found open-call signals and no hard exclusion.");

    return { ...candidate, triageStatus: status, triageReasons: reasons };
  });
}
