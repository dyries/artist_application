import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiResponse";
import { deleteWorkEntry, readArtistData } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const workId = Number(id);
    if (!Number.isInteger(workId) || workId <= 0) {
      return NextResponse.json({ error: "Invalid work id" }, { status: 400 });
    }

    deleteWorkEntry(workId);
    return NextResponse.json(readArtistData());
  } catch (error) {
    return apiErrorResponse(error, "Failed to delete work");
  }
}
