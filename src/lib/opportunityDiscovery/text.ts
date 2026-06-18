import crypto from "node:crypto";

const trackingParams = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "igshid",
  "ref",
  "ref_src",
  "campaign"
]);

export function normalizeTitle(value: string) {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/\b(open call|call for artists|application|apply now|deadline|202[0-9])\b/g, " ")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeOpportunityUrl(url: string, baseUrl?: string) {
  const parsed = new URL(url, baseUrl);
  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase();
  if ((parsed.protocol === "https:" && parsed.port === "443") || (parsed.protocol === "http:" && parsed.port === "80")) {
    parsed.port = "";
  }
  for (const key of [...parsed.searchParams.keys()]) {
    if (trackingParams.has(key.toLowerCase()) || key.toLowerCase().startsWith("utm_")) {
      parsed.searchParams.delete(key);
    }
  }
  parsed.searchParams.sort();
  parsed.pathname = parsed.pathname.replace(/\/{2,}/g, "/");
  if (parsed.pathname.length > 1) parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  return parsed.toString();
}

export function canonicalDomain(url: string) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function fingerprint(value: string) {
  return crypto.createHash("sha1").update(value.toLowerCase().replace(/\s+/g, " ").trim()).digest("hex").slice(0, 16);
}

export function textIncludesAny(text: string, needles: string[]) {
  const normalized = text.toLowerCase();
  return needles.some((needle) => normalized.includes(needle.toLowerCase()));
}

export function splitTerms(value: string) {
  return Array.from(new Set(value
    .split(/[,;；、\n|/]+|\s{2,}/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)
  ));
}

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function deadlineTimestamp(deadline: string) {
  const isoDate = deadline.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1];
  if (!isoDate) return Number.POSITIVE_INFINITY;
  const timestamp = Date.parse(`${isoDate}T23:59:59Z`);
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

function stripDiacritics(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}
