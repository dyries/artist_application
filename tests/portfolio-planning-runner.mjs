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

const imagePages = Array.from({ length: 12 }, (_, index) => index % 3 === 0
  ? {
      type: "series_overview_grid",
      title: `Project ${index + 1}`,
      projectGroup: `Project ${index + 1}`,
      images: [0, 1, 2, 3].map((offset) => ({ role: "overview", path: `/image-${index + offset + 1}.jpg`, caption: `Work ${index + offset + 1}` })),
      layoutStrategy: "series_overview_grid",
      pageRole: "overview"
    }
  : {
      type: "single_work_full_page",
      title: `Work ${index + 1}`,
      imagePath: `/image-${index + 1}.jpg`,
      layoutStrategy: "single_work_full_page",
      pageRole: "primary_work"
    });

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

const availableWorks = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  title: `${["Atlas Red", "Civic Surface", "Archive Window"][Math.floor(index / 4)]} Work ${index + 1}`,
  year: "2026",
  medium: index % 4 === 0 ? "Installation documentation" : index % 3 === 0 ? "Image research" : "Oil on canvas",
  dimensions: "100 x 80 cm",
  imagePath: `/fixture-${index + 1}.jpg`
}));

const audit = {
  existingPortfolioSources: [],
  availableWorks,
  availableImageFiles: availableWorks.map((work) => work.imagePath),
  missingMetadata: [],
  lowConfidenceFacts: [],
  opportunitySpecificConstraints: {},
  portfolioConstraints: defaultConstraints,
  materialsActuallyUsed: [],
  imageAnalyses: []
};

const layoutResearch = {
  searchedAt: "2026-06-05T00:00:00.000Z",
  queriesUsed: [],
  references: [],
  derivedLayoutPrinciples: [
    "Organize pages by project group.",
    "Use overview grids.",
    "Use installation and detail pages.",
    "Use concise captions.",
    "Vary page rhythm."
  ],
  portfolioStrategyForThisArtist: [],
  appliedPrinciples: ["Organize pages by project group.", "Use overview grids.", "Vary page rhythm."],
  liveWebResearchUnavailable: true
};

const collapsedDuplicatePlan = {
  artistName: "Test Artist",
  portfolioTitle: "Selected Works",
  year: "2026",
  language: "en",
  portfolioConstraints: defaultConstraints,
  pages: [
    { type: "cover", title: "Test Artist", layoutStrategy: "cover", pageRole: "cover" },
    { type: "short_statement", text: "Statement.", layoutStrategy: "statement", pageRole: "statement" },
    ...availableWorks.slice(0, 8).map((work) => ({
      type: "single_work_full_page",
      title: work.title,
      year: work.year,
      medium: work.medium,
      dimensions: work.dimensions,
      imagePath: work.imagePath,
      caption: work.title,
      projectGroup: work.title.split(":")[0],
      layoutStrategy: "single_work_full_page",
      pageRole: "primary_work"
    })),
    ...availableWorks.slice(0, 8).map((work) => ({
      type: "text_image_context",
      title: work.title,
      year: work.year,
      medium: work.medium,
      dimensions: work.dimensions,
      projectGroup: work.title.split(":")[0],
      images: [{ role: "context", path: work.imagePath, caption: work.title }],
      text: "Context note.",
      caption: work.title,
      layoutStrategy: "text_image_context",
      pageRole: "context"
    })),
    { type: "selected_works_list", title: "Selected Works", works: availableWorks.map((work) => work.title), layoutStrategy: "selected_works_list", pageRole: "list" },
    { type: "contact_page", title: "Contact", text: "artist@example.com", layoutStrategy: "contact_page", pageRole: "contact" }
  ],
  excludedImages: [],
  qualityRisks: [],
  curatorialSummary: {
    projectGroupCount: 3,
    layoutStrategyCounts: {},
    workTypeCounts: {},
    passedDiversityGate: false
  },
  layoutResearchUsed: {
    referenceCount: 0,
    researchFile: "internal-notes/portfolio-layout-research.md",
    derivedPrinciples: layoutResearch.derivedLayoutPrinciples,
    appliedPrinciples: layoutResearch.appliedPrinciples
  }
};

const repaired = __portfolioTestHooks.repairPortfolioPlan(
  collapsedDuplicatePlan,
  [{ code: "duplicate_images", message: "duplicate images", severity: "auto_fixable" }],
  audit,
  layoutResearch
).plan;
const roles = __portfolioTestHooks.requiredPortfolioLayoutRoles(repaired.pages);
assert.ok(repaired.pages.length >= defaultConstraints.minimumPages);
assert.ok(repaired.pages.length <= defaultConstraints.maximumPages);
assert.deepEqual(roles, {
  cover: true,
  statement: true,
  projectDividers: true,
  grids: true,
  singleImagePages: true,
  detailPages: true,
  mixedImageTextPages: true,
  selectedWorks: true,
  contactCvSummary: true
});
assert.ok(repaired.curatorialSummary.projectGroupCount >= 3);
