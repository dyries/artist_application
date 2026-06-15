import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiResponse";
import { readArtistData, updateOpportunityStatus } from "@/lib/db";
import type { OpportunityStatus } from "@/types/domain";

const selectableStatuses = new Set<OpportunityStatus>(["selected_by_user", "not_selected"]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const opportunityId = Number(id);
    const body = await request.json() as { status?: OpportunityStatus };
    if (!Number.isInteger(opportunityId) || opportunityId <= 0) {
      return NextResponse.json({ error: "Valid opportunity id is required" }, { status: 400 });
    }
    if (!body.status || !selectableStatuses.has(body.status)) {
      return NextResponse.json({ error: "Status must be selected_by_user or not_selected" }, { status: 400 });
    }
    updateOpportunityStatus(opportunityId, body.status);
    return NextResponse.json(readArtistData());
  } catch (error) {
    return apiErrorResponse(error, "Failed to update opportunity status");
  }
}
