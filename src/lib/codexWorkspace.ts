import fs from "node:fs";
import path from "node:path";
import { readArtistData } from "./db";
import {
  generatedCodexDir,
  generatedApplicationsDir,
  generatedFinalSubmissionsDir,
  generatedReportsDir,
  sourceMaterialsDir,
  worksDir
} from "./paths";
import { buildMachineApplicationPreferences, renderCodexAutomationInstructions } from "./automationRules";

function writeJson(filePath: string, value: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

export function exportCodexWorkspace() {
  fs.mkdirSync(generatedCodexDir, { recursive: true });
  fs.mkdirSync(generatedApplicationsDir, { recursive: true });
  fs.mkdirSync(generatedFinalSubmissionsDir, { recursive: true });
  fs.mkdirSync(generatedReportsDir, { recursive: true });
  fs.mkdirSync(worksDir, { recursive: true });
  fs.mkdirSync(sourceMaterialsDir, { recursive: true });

  const data = readArtistData({
    materialLimit: 300,
    materialContentLimit: 6000,
    opportunityLimit: 300,
    opportunityRawContentLimit: 2000,
    applicationLimit: 200
  });
  const snapshotPath = path.join(generatedCodexDir, "artist-snapshot.json");
  const instructionsPath = path.join(generatedCodexDir, "automation-instructions.md");

  writeJson(snapshotPath, {
    exportedAt: new Date().toISOString(),
    lightweightSnapshot: true,
    counts: data.counts,
    profile: data.profile,
    applicationPreferences: buildMachineApplicationPreferences(data.profile),
    works: data.works,
    cv: data.cv,
    materialSources: data.materialSources.map((source) => ({
      ...source,
      contentExcerpt: source.content,
      structuredAnalysisExcerpt: source.analysis,
      contentTruncated: source.content.length >= 6000,
      analysisTruncated: source.analysis.length >= 6000,
      content: undefined
    })),
    currentOpportunities: data.opportunities,
    currentApplications: data.applications,
    directories: {
      sourceMaterialsDir,
      worksDir,
      generatedApplicationsDir,
      generatedFinalSubmissionsDir,
      generatedReportsDir
    }
  });

  fs.writeFileSync(instructionsPath, renderCodexAutomationInstructions(), "utf8");

  return { snapshotPath, instructionsPath };
}
