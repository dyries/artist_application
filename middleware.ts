import { NextRequest, NextResponse } from "next/server";
import { hasConfiguredAuth, isAuthorizedNonLocalRequest, isLocalHost } from "@/lib/auth";

export function middleware(request: NextRequest) {
  if (isLocalRequest(request)) return NextResponse.next();

  if (!hasConfiguredAuth()) {
    return new NextResponse("Artist Studio access is not configured.", { status: 503 });
  }

  if (isAuthorizedNonLocalRequest(request.headers)) return NextResponse.next();

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": "Basic realm=\"Artist Studio\"" }
  });
}

function isLocalRequest(request: NextRequest) {
  return isLocalHost(request.nextUrl.hostname);
}

export const config = {
  matcher: [
    "/api/:path*"
  ]
};
