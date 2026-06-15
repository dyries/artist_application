const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function isLocalHost(hostname: string) {
  return localHosts.has(hostname.toLowerCase());
}

export function requestBearerToken(headers: Pick<Headers, "get">) {
  const authorization = headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || headers.get("x-artist-studio-token") || "";
}

export function basicAuthMatches(headers: Pick<Headers, "get">, user: string, password: string) {
  const authorization = headers.get("authorization") || "";
  const match = authorization.match(/^Basic\s+(.+)$/i);
  if (!match) return false;

  try {
    const decoded = decodeBase64(match[1]);
    const separator = decoded.indexOf(":");
    if (separator < 0) return false;
    return decoded.slice(0, separator) === user && decoded.slice(separator + 1) === password;
  } catch {
    return false;
  }
}

export function isAuthorizedNonLocalRequest(headers: Pick<Headers, "get">) {
  const apiToken = process.env.ARTIST_STUDIO_API_TOKEN || "";
  const authUser = process.env.ARTIST_STUDIO_AUTH_USER || "";
  const authPassword = process.env.ARTIST_STUDIO_AUTH_PASSWORD || "";
  if (apiToken && requestBearerToken(headers) === apiToken) return true;
  return Boolean(authUser && authPassword && basicAuthMatches(headers, authUser, authPassword));
}

export function hasConfiguredAuth() {
  return Boolean(process.env.ARTIST_STUDIO_API_TOKEN || (process.env.ARTIST_STUDIO_AUTH_USER && process.env.ARTIST_STUDIO_AUTH_PASSWORD));
}

function decodeBase64(value: string) {
  if (typeof atob === "function") return atob(value);
  return Buffer.from(value, "base64").toString("utf8");
}
