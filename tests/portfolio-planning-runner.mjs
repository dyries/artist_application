import assert from "node:assert/strict";
import { __portfolioTestHooks } from "../src/lib/package.ts";

const defaultConstraints = __portfolioTestHooks.inferPortfolioConstraints("Submit a portfolio PDF.");
assert.equal(defaultConstraints.targetPages, 20);
assert.equal(defaultConstraints.minimumPages, 16);
assert.equal(defaultConstraints.maximumPages, 24);
assert.equal(defaultConstraints.source, "default");

const tenPageConstraints = __portfolioTestHooks.inferPortfolioConstraints("Submit a portfolio PDF, 10 pages maximum.");
assert.equal(tenPageConstraints.targetPages, 10);
assert.equal(tenPageConstraints.maximumPages, 10);
assert.equal(tenPageConstraints.source, "opportunity");

const uploadOnlyConstraints = __portfolioTestHooks.inferPortfolioConstraints("Upload 10 individual images. Do not submit a portfolio PDF.");
assert.equal(uploadOnlyConstraints.requiresImageUploadOnly, true);
assert.equal(uploadOnlyConstraints.source, "opportunity");
assert.equal(uploadOnlyConstraints.maximumPages, 10);
assert.deepEqual(uploadOnlyConstraints.imageCountRange, { minimum: 1, maximum: 10 });

const imagePages = Array.from({ length: 12 }, (_, index) => ({
  type: "single_work_full_page",
  title: `Work ${index + 1}`,
  imagePath: `/image-${index + 1}.jpg`,
  layoutStrategy: "single_work_full_page",
  pageRole: "primary_work"
}));

const expanded = __portfolioTestHooks.expandPlanTowardTarget({
  artistName: "Test Artist",
  portfolioTitle: "Selected Works",
  year: "2026",
  language: "en",
  portfolioConstraints: defaultConstraints,
  pages: [
    { type: "cover", title: "Test Artist", layoutStrategy: "cover", pageRole: "cover" },
    { type: "short_statement", text: "Statement.", layoutStrategy: "statement", pageRole: "statement" },
    ...imagePages,
    { type: "selected_works_list", title: "Selected Works", works: [], layoutStrategy: "selected_works_list", pageRole: "list" },
    { type: "contact_page", title: "Contact", text: "test@example.com", layoutStrategy: "contact_page", pageRole: "contact" }
  ],
  excludedImages: [],
  qualityRisks: [],
  curatorialSummary: {
    projectGroupCount: 0,
    layoutStrategyCounts: {},
    workTypeCounts: {},
    passedDiversityGate: false
  },
  layoutResearchUsed: {
    referenceCount: 0,
    researchFile: "internal-notes/portfolio-layout-research.md",
    derivedPrinciples: [],
    appliedPrinciples: []
  }
});

assert.equal(expanded.pages.length, 20);
