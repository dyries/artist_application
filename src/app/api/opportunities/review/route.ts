import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiResponse";
import { readArtistData, updateOpportunityStatus } from "@/lib/db";
import { runProjectAutomation } from "@/lib/projectAutomation";
import type { OpportunityStatus } from "@/types/domain";

const firstReviewStatuses = new Set<OpportunityStatus>(["new", "recommended", "confirmed"]);

export async function POST(request: Request) {
  try {
    const body = await request.json() as { selectedOpportunityIds?: unknown };
    const selectedIds = new Set(parseIds(body.selectedOpportunityIds));
    const data = readArtistData({ opportunityLimit: 1000, opportunityRawContentLimit: 0, applicationLimit: 0 });
    const reviewable = data.opportunities.filter((opportunity) => firstReviewStatuses.has(opportunity.status));

    for (const opportunity of reviewable) {
      updateOpportunityStatus(opportunity.id, selectedIds.has(opportunity.id) ? "selected_by_user" : "not_selected");
    }

    const selectedCount = reviewable.filter((opportunity) => selectedIds.has(opportunity.id)).length;
    if (selectedCount === 0) {
      return NextResponse.json({
        selectedCount,
        automation: null,
        data: readArtistData()
      });
    }

    const automation = await runProjectAutomation({ phase: "prepare-selected" });
    return NextResponse.json({
      selectedCount,
      automation,
      data: automation.data
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to complete opportunity review");
  }
}

function parseIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
}
