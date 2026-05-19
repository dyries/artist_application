import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiResponse";
import { runProjectAutomation } from "@/lib/projectAutomation";

export async function POST() {
  try {
    return NextResponse.json(await runProjectAutomation());
  } catch (error) {
    return apiErrorResponse(error, "Project automation failed");
  }
}
