import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiResponse";
import { deleteMaterialSource, readArtistData } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const materialId = Number(id);
    if (!Number.isInteger(materialId) || materialId <= 0) {
      return NextResponse.json({ error: "Invalid material id" }, { status: 400 });
    }

    deleteMaterialSource(materialId);
    return NextResponse.json(readArtistData());
  } catch (error) {
    return apiErrorResponse(error, "Failed to delete material");
  }
}
