import dns from "node:dns/promises";
import net from "node:net";

const blockedHostnames = new Set([
  "localhost",
  "localhost.localdomain"
]);

export function normalizePublicOpportunityUrl(value: string) {
  const trimmed = value.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Opportunity URL must be a valid URL.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Opportunity URL must use https://.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Opportunity URL must not include credentials.");
  }
  if (isBlockedHostname(parsed.hostname)) {
    throw new Error("Opportunity URL cannot point to localhost, private networks, or internal addresses.");
  }
  parsed.hash = "";
  return parsed.toString();
}

export async function assertPublicOpportunityUrl(value: string) {
  const normalized = normalizePublicOpportunityUrl(value);
  const parsed = new URL(normalized);
  const records = await dns.lookup(parsed.hostname, { all: true, verbatim: true });
  if (records.length === 0) {
    throw new Error("Opportunity URL hostname could not be resolved.");
  }
  if (records.some((record) => isBlockedIp(record.address))) {
    throw new Error("Opportunity URL resolves to a private or internal address.");
  }
  return normalized;
}

function isBlockedHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  if (blockedHostnames.has(normalized)) return true;
  if (normalized.endsWith(".localhost") || normalized.endsWith(".local")) return true;
  if (net.isIP(normalized)) return isBlockedIp(normalized);
  return false;
}

function isBlockedIp(value: string) {
  if (value === "::1") return true;
  if (value.startsWith("fe80:")) return true;
  if (value.startsWith("fc") || value.startsWith("fd")) return true;

  if (net.isIPv4(value)) {
    const parts = value.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true;
  }

  if (value.startsWith("::ffff:")) {
    return isBlockedIp(value.slice(7));
  }

  return false;
}
