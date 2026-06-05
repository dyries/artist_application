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

const detailPath = "/Users/chenyu/Desktop/艺术家/artist-assets/works/mandatory-selection/work-detail-crop.jpg";
const completePath = "/Users/chenyu/Desktop/艺术家/artist-assets/works/mandatory-selection/work-complete.jpg";
const mandatoryFailure = checkPortfolioOutput({
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
        imagePath: detailPath,
        imageRole: "cropped",
        projectGroup: "Work",
        layoutStrategy: "single_work_full_page",
        pageRole: "primary_work"
      },
      {
        type: "selected_works_list",
        title: "Selected Works",
        works: ["Work", "Unrepresented A", "Unrepresented B", "Unrepresented C", "Unrepresented D", "Unrepresented E"],
        layoutStrategy: "selected_works_list",
        pageRole: "list"
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
  },
  portfolioSourceAudit: {
    existingPortfolioSources: [],
    availableWorks: [{ id: 1, title: "Work", imagePath: completePath }],
    availableImageFiles: [completePath, detailPath],
    missingMetadata: [],
    lowConfidenceFacts: [],
    opportunitySpecificConstraints: {},
    materialsActuallyUsed: [],
    imageAnalyses: [
      {
        path: completePath,
        width: 2600,
        height: 1800,
        aspectRatio: 1.44,
        orientation: "landscape",
        fileSizeBytes: 900000,
        format: "jpeg",
        dominantColors: [],
        averageBrightness: 0.5,
        tooSmallForFullPage: false,
        qualityRisks: [],
        recommendedRoles: ["complete_work_image"],
        completeWorkScore: 95,
        primaryCandidate: true,
        supportOnly: false
      },
      {
        path: detailPath,
        width: 2600,
        height: 1800,
        aspectRatio: 1.44,
        orientation: "landscape",
        fileSizeBytes: 900000,
        format: "jpeg",
        dominantColors: [],
        averageBrightness: 0.5,
        tooSmallForFullPage: false,
        qualityRisks: ["detail"],
        recommendedRoles: ["cropped", "detail"],
        assignedRole: "cropped",
        completeWorkScore: 20,
        primaryCandidate: false,
        cropRisk: true,
        partialImageRisk: true,
        supportOnly: true
      }
    ],
    supportOnlyImages: [{ path: detailPath, assignedRole: "cropped", reason: "detail" }],
    projectGroupPrimaryImages: [{ projectGroup: "Work", completeImageAvailable: true, reason: "Complete exists but no primary was selected." }]
  }
});

assert.equal(mandatoryFailure.ok, false);
assert.ok(mandatoryFailure.issues.some((issue) => /primary page uses incomplete|complete image exists/i.test(issue)));
