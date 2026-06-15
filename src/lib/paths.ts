import path from "node:path";

export const projectRoot = process.env.ARTIST_STUDIO_WORKSPACE_ROOT
  ? path.resolve(process.env.ARTIST_STUDIO_WORKSPACE_ROOT)
  : process.cwd();
export const dataDir = path.join(projectRoot, "data");
export const dbPath = path.join(dataDir, "artist.sqlite");
export const generatedApplicationsDir = path.join(projectRoot, "generated", "applications");
export const generatedFinalSubmissionsDir = path.join(projectRoot, "generated", "final-submissions");
export const generatedReportsDir = path.join(projectRoot, "generated", "reports");
export const generatedCodexDir = path.join(projectRoot, "generated", "codex");
export const worksDir = path.join(projectRoot, "artist-assets", "works");
export const sourceMaterialsDir = path.join(projectRoot, "artist-assets", "source-materials");
export const materialsInboxDir = path.join(projectRoot, "artist-assets", "inbox");
