import assert from "node:assert/strict";
import { checkPortfolioOutput } from "../src/lib/portfolioQualityCheck.ts";

const output = checkPortfolioOutput({
  portfolioText: "",
  selectedWorks: "",
  portfolioPlan: {
    artistName: "Test Artist",
    portfolioTitle: "Selected Works",
    year: "2026",
    language: "en",
    portfolioConstraints: {
      targetPages: 20,
      minimumPages: 16,
      maximumPages: 24,
      source: "default",
      reason: "No explicit opportunity page limit; default to a formal portfolio around 20 pages."
    },
    pages: [
      {
        type: "single_work_full_page",
        title: "Work",
        imagePath: "/tmp/work.jpg",
        layoutStrategy: "single_work_full_page",
        pageRole: "primary_work"
      }
    ],
    excludedImages: [],
    qualityRisks: [],
    curatorialSummary: {
      projectGroupCount: 1,
      layoutStrategyCounts: { single_work_full_page: 1 },
      workTypeCounts: { painting: 1 },
      passedDiversityGate: false
    },
    layoutResearchUsed: {
      referenceCount: 0,
      researchFile: "internal-notes/portfolio-layout-research.md",
      derivedPrinciples: [],
      appliedPrinciples: []
    }
  }
});

assert.ok(output.ok);
assert.deepEqual(output.issues, []);
