import { NextRequest, NextResponse } from "next/server";

const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function middleware(request: NextRequest) {
  if (isLocalRequest(request)) return NextResponse.next();

  const apiToken = process.env.ARTIST_STUDIO_API_TOKEN || "";
  const authUser = process.env.ARTIST_STUDIO_AUTH_USER || "";
  const authPassword = process.env.ARTIST_STUDIO_AUTH_PASSWORD || "";
  const hasCredentials = Boolean(apiToken || (authUser && authPassword));

  if (!hasCredentials) {
    return new NextResponse("Artist Studio access is not configured.", { status: 503 });
  }

  if (apiToken && bearerToken(request) === apiToken) return NextResponse.next();
  if (authUser && authPassword && basicAuthMatches(request, authUser, authPassword)) {
    return NextResponse.next();
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": "Basic realm=\"Artist Studio\"" }
  });
}

function isLocalRequest(request: NextRequest) {
  const host = request.nextUrl.hostname.toLowerCase();
  return localHosts.has(host);
}

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || request.headers.get("x-artist-studio-token") || "";
}

function basicAuthMatches(request: NextRequest, user: string, password: string) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Basic\s+(.+)$/i);
  if (!match) return false;

  try {
    const decoded = atob(match[1]);
    const separator = decoded.indexOf(":");
    if (separator < 0) return false;
    return decoded.slice(0, separator) === user && decoded.slice(separator + 1) === password;
  } catch {
    return false;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)"
  ]
};
