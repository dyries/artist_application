import { NextResponse } from "next/server";
import path from "node:path";
import { apiErrorResponse } from "@/lib/apiResponse";
import { mapWithConcurrency } from "@/lib/concurrency";
import {
  maxUploadedMaterialBytes,
  maxUploadedMaterialFiles,
  maxUploadedMaterialRequestBytes,
  saveUploadedMaterial,
  supportedMaterialExtensions
} from "@/lib/fileMaterials";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const files = form.getAll("files").filter((item): item is File => item instanceof File);
    if (files.length > maxUploadedMaterialFiles) {
      return NextResponse.json({ error: `Too many files. Upload at most ${maxUploadedMaterialFiles} files at once.` }, { status: 400 });
    }

    for (const file of files) {
      const ext = path.extname(file.name || "").toLowerCase();
      if (!supportedMaterialExtensions.has(ext)) {
        return NextResponse.json({ error: `Unsupported material file type: ${file.name}` }, { status: 400 });
      }
      if (file.size > maxUploadedMaterialBytes) {
        return NextResponse.json({ error: `File is too large: ${file.name}` }, { status: 413 });
      }
    }
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > maxUploadedMaterialRequestBytes) {
      return NextResponse.json({ error: "Uploaded files are too large in total." }, { status: 413 });
    }

    const materials = await mapWithConcurrency(files, 3, (file) => saveUploadedMaterial(file));
    return NextResponse.json({ materials });
  } catch (error) {
    return apiErrorResponse(error, "Upload failed");
  }
}
