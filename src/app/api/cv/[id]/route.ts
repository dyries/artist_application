import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiResponse";
import { deleteCvEntry, readArtistData } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const cvId = Number(id);
    if (!Number.isInteger(cvId) || cvId <= 0) {
      return NextResponse.json({ error: "Invalid CV id" }, { status: 400 });
    }

    deleteCvEntry(cvId);
    return NextResponse.json(readArtistData());
  } catch (error) {
    return apiErrorResponse(error, "Failed to delete CV entry");
  }
}
