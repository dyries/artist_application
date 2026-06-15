import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiResponse";
import { readArtistData, saveArtistData } from "@/lib/db";
import { artistPayloadSchema } from "@/lib/schemas";

export async function GET() {
  try {
    return NextResponse.json(readArtistData());
  } catch (error) {
    return apiErrorResponse(error, "Failed to read artist data");
  }
}

export async function PUT(request: Request) {
  try {
    const payload = artistPayloadSchema.parse(await request.json());
    saveArtistData(payload);
    return NextResponse.json(readArtistData());
  } catch (error) {
    return apiErrorResponse(error, "Failed to save artist data");
  }
}
