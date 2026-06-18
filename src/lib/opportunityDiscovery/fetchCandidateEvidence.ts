import { readOpportunityFetchCache, recordOpportunityFetchCache } from "@/lib/db";
import { mapWithConcurrency } from "@/lib/concurrency";
import { fetchOpportunityPageForUrl, type PageFetchResult } from "@/lib/opportunityPages";
import { fingerprint } from "./text";
import type { TriagedCandidate } from "./types";

const evidenceConcurrency = readPositiveInt("ARTIST_STUDIO_DISCOVERY_EVIDENCE_CONCURRENCY", 3);
const cacheTtlHours = readPositiveInt("ARTIST_STUDIO_DISCOVERY_CACHE_TTL_HOURS", 24);

export type CandidateEvidence = PageFetchResult & {
  fromCache: boolean;
  contentFingerprint: string;
};

export async function fetchCandidateEvidence(candidates: TriagedCandidate[]) {
  const entries = await mapWithConcurrency(candidates, evidenceConcurrency, async (candidate) => {
    const cached = readOpportunityFetchCache(candidate.normalizedUrl);
    if (cached && cacheFresh(cached.fetchedAt)) {
      const evidence: CandidateEvidence = {
        opportunityId: 0,
        url: candidate.url,
        ok: cached.status === "ok",
        title: candidate.title,
        content: cached.contentExcerpt,
        mode: "static-fetch",
        fromCache: true,
        contentFingerprint: cached.contentFingerprint
      };
      return [candidate.url, evidence] as const;
    }

    const fetched = await fetchOpportunityPageForUrl({ url: candidate.url, title: candidate.title });
    const contentFingerprint = fingerprint(`${fetched.title}\n${fetched.content}`);
    recordOpportunityFetchCache({
      normalizedUrl: candidate.normalizedUrl,
      contentFingerprint,
      contentExcerpt: fetched.content.slice(0, 60000),
      status: fetched.ok ? "ok" : "failed"
    });
    return [candidate.url, { ...fetched, fromCache: false, contentFingerprint }] as const;
  });
  return new Map(entries);
}

function cacheFresh(fetchedAt: string) {
  const timestamp = Date.parse(fetchedAt);
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp < cacheTtlHours * 60 * 60 * 1000;
}

function readPositiveInt(name: string, fallback: number) {
  const value = Number(process.env[name] || "");
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
