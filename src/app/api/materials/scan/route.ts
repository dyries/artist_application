import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiResponse";
import { logActivity, readArtistData, readMaterialFilePaths, saveArtistData } from "@/lib/db";
import { scanMaterialsInbox } from "@/lib/materialScanner";

export async function POST() {
  try {
    const existingFilePaths = readMaterialFilePaths();
    const materials = await scanMaterialsInbox(existingFilePaths);
    if (materials.length > 0) {
      const data = readArtistData({ materialLimit: 1000, materialContentLimit: 50000 });
      saveArtistData({
        profile: data.profile,
        works: data.works,
        cv: data.cv,
        materialSources: [...materials, ...data.materialSources]
      });
    }
    logActivity({
      action: "materials_scanned",
      entityType: "material_sources",
      summary: `Scanned inbox and found ${materials.length} new material source(s).`,
      metadata: { newMaterials: materials.map((material) => ({ title: material.title, filePath: material.filePath })) }
    });
    return NextResponse.json({ materials, data: readArtistData() });
  } catch (error) {
    return apiErrorResponse(error, "Failed to scan project materials");
  }
}
