import type { NormalizedCandidate, SearchResult } from "./types";
import { canonicalDomain, fingerprint, normalizeOpportunityUrl, normalizeTitle } from "./text";

export function normalizeCandidates(results: SearchResult[]) {
  return results.flatMap((result) => {
    try {
      const normalizedUrl = normalizeOpportunityUrl(result.url);
      const normalizedTitle = normalizeTitle(result.title || normalizedUrl);
      const domain = canonicalDomain(normalizedUrl);
      const canonicalUrl = normalizedUrl;
      const contentFingerprint = fingerprint(`${normalizedTitle}|${domain}|${result.snippet || ""}`);
      const duplicateGroupId = fingerprint(`${domain}|${normalizedTitle || normalizedUrl}`);
      const isOfficialSource = isLikelyOfficialSource(result);
      const candidate: NormalizedCandidate = {
        ...result,
        url: normalizedUrl,
        canonicalUrl,
        normalizedUrl,
        normalizedTitle,
        contentFingerprint,
        duplicateGroupId,
        officialSourceUrl: isOfficialSource ? normalizedUrl : undefined,
        isOfficialSource
      };
      return [candidate];
    } catch {
      return [];
    }
  });
}

function isLikelyOfficialSource(result: SearchResult) {
  if (result.sourceType === "institution_site") return true;
  const title = `${result.title} ${result.snippet || ""}`.toLowerCase();
  return /\b(official|apply|application|programme|program)\b/.test(title) && !/\b(news|magazine|listing|newsletter)\b/.test(title);
}
