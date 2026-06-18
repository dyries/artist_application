import type { DedupedCandidate, NormalizedCandidate } from "./types";
import { fingerprint, opportunityUrlIdentity } from "./text";

export function deduplicateCandidates(candidates: NormalizedCandidate[]): DedupedCandidate[] {
  const groups = new Map<string, NormalizedCandidate[]>();
  for (const candidate of candidates) {
    const key = dedupeKey(candidate);
    const current = groups.get(key) || [];
    current.push(candidate);
    groups.set(key, current);
  }
  return [...groups.entries()].map(([key, group]) => {
    const primary = choosePrimary(group);
    return {
      ...primary,
      duplicateGroupId: key,
      alternateSources: group.filter((item) => item !== primary)
    };
  });
}

function dedupeKey(candidate: NormalizedCandidate) {
  const urlIdentity = opportunityUrlIdentity(candidate.canonicalUrl || candidate.normalizedUrl);
  if (candidate.normalizedTitle) return fingerprint(`${urlIdentity}|${candidate.normalizedTitle}`);
  return candidate.duplicateGroupId || fingerprint(`${urlIdentity}|${candidate.contentFingerprint}`);
}

function choosePrimary(group: NormalizedCandidate[]) {
  return [...group].sort((left, right) => Number(right.isOfficialSource) - Number(left.isOfficialSource)
    || sourcePriority(right.sourceType) - sourcePriority(left.sourceType)
    || (right.snippet?.length || 0) - (left.snippet?.length || 0)
  )[0];
}

function sourcePriority(sourceType: string) {
  if (sourceType === "institution_site") return 4;
  if (sourceType === "web_search") return 3;
  if (sourceType === "curated_board") return 2;
  if (sourceType === "manual") return 5;
  return 1;
}
