import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiResponse";
import { archiveApprovedSubmission } from "@/lib/finalApproval";
import { getApplication, logActivity, readArtistData, updateOpportunityStatus } from "@/lib/db";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const applicationId = Number(id);
    const body = await request.json() as { decision?: "approve_final_submission_package" | "request_revision" };
    if (!Number.isInteger(applicationId) || applicationId <= 0) {
      return NextResponse.json({ error: "Valid application id is required" }, { status: 400 });
    }
    const application = getApplication(applicationId);
    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    const data = readArtistData();
    const opportunity = data.opportunities.find((item) => item.id === application.opportunityId) || null;
    if (body.decision === "approve_final_submission_package") {
      const archive = archiveApprovedSubmission(application, opportunity);
      updateOpportunityStatus(application.opportunityId, "approved_for_submission");
      logActivity({
        action: "final_submission_package_approved",
        entityType: "application",
        entityId: applicationId,
        summary: "User approved the final submission package. External submission can be assisted next, but payment/login/captcha/legal/privacy gates still require user action.",
        metadata: { opportunityId: application.opportunityId, archive }
      });
    } else if (body.decision === "request_revision") {
      updateOpportunityStatus(application.opportunityId, "quality_blocked");
      logActivity({
        action: "final_submission_package_revision_requested",
        entityType: "application",
        entityId: applicationId,
        summary: "User requested revision before final submission.",
        metadata: { opportunityId: application.opportunityId }
      });
    } else {
      return NextResponse.json({ error: "Decision must be approve_final_submission_package or request_revision" }, { status: 400 });
    }
    return NextResponse.json(readArtistData());
  } catch (error) {
    return apiErrorResponse(error, "Failed to update final package review decision");
  }
}
