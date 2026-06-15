import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiResponse";
import { exportCodexWorkspace } from "@/lib/codexWorkspace";
import { logActivity } from "@/lib/db";

export async function POST() {
  try {
    const result = exportCodexWorkspace();
    logActivity({
      action: "codex_workspace_exported",
      entityType: "codex_workspace",
      summary: "Generated Codex automation snapshot and instructions.",
      metadata: result
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error, "Failed to export Codex workspace");
  }
}
