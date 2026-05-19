import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function apiErrorResponse(error: unknown, fallback: string, status = 400) {
  const message = errorMessage(error, fallback);
  return NextResponse.json({ error: message }, { status });
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => `${issue.path.join(".") || "payload"}: ${issue.message}`).join("; ");
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
