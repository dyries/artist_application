import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiResponse";
import { addManualOpportunityLink, readArtistData } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { url?: string; title?: string; notes?: string };
    if (!body.url) {
      return NextResponse.json({ error: "Opportunity URL is required" }, { status: 400 });
    }
    addManualOpportunityLink({ url: body.url, title: body.title, notes: body.notes });
    return NextResponse.json(readArtistData());
  } catch (error) {
    return apiErrorResponse(error, "Failed to add opportunity link");
  }
}
