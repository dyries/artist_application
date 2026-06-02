import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { writeApplicationPackage } from "../src/lib/package.ts";

const root = process.cwd();
const firstDir = path.join(root, "artist-assets", "works", "behavior-fixture-a");
const secondDir = path.join(root, "artist-assets", "works", "behavior-fixture-b");
const firstImage = path.join(firstDir, "image.jpg");
const secondImage = path.join(secondDir, "image.jpg");

await fs.promises.mkdir(firstDir, { recursive: true });
await fs.promises.mkdir(secondDir, { recursive: true });
await sharp({
  create: {
    width: 2400,
    height: 1600,
    channels: 3,
    background: { r: 230, g: 228, b: 220 }
  }
}).jpeg({ quality: 88 }).toFile(firstImage);
await sharp({
  create: {
    width: 2200,
    height: 1500,
    channels: 3,
    background: { r: 210, g: 214, b: 220 }
  }
}).jpeg({ quality: 88 }).toFile(secondImage);

const opportunity = {
  id: 990001,
  title: "Behavior Fixture Residency",
  organization: "Fixture Space",
  url: "https://example.com/open-call",
  location: "Online",
  deadline: "2026-12-31",
  fee: "Free",
  funding: "None",
  eligibility: "International artists",
  materials: "Submit a portfolio PDF. If available, include a short portfolio version, individual image uploads, and one combined PDF.",
  submissionMethod: "email",
  summary: "Fixture opportunity for automated package generation behavior.",
  score: 90,
  risks: "",
  status: "selected_by_user",
  source: "test",
  rawContent: "",
  createdAt: "",
  updatedAt: ""
};

const profile = {
  id: 1,
  name: "Fanzhou Lu / 卢泛舟",
  nameZh: "卢泛舟",
  nameEn: "Fanzhou Lu",
  email: "artist@example.com",
  location: "",
  locationZh: "",
  locationEn: "",
  website: "https://example.com",
  instagram: "",
  bioZhShort: "",
  bioZhMedium: "",
  bioZhLong: "",
  bioEnShort: "",
  bioEnMedium: "",
  bioEnLong: "",
  statementZh: "",
  statementEn: "Fanzhou Lu works through painting, image research, and installation-oriented projects to examine how political and historical images shift through surface, reproduction, humor, and concealment.",
  preferences: "",
  preferencesZh: "",
  preferencesEn: "",
  applicationRegion: "worldwide",
  automationBatchLimit: 5,
  submissionApprovalMode: "review_required",
  opportunityFeePreference: "conservative",
  opportunityTierPreference: "high_tier",
  updatedAt: ""
};

const works = [
  {
    id: 1,
    title: "First Work",
    titleZh: "",
    titleEn: "First Work",
    year: "2024",
    medium: "Oil on canvas",
    mediumZh: "",
    mediumEn: "Oil on canvas",
    dimensions: "120 x 90 cm",
    dimensionsZh: "",
    dimensionsEn: "120 x 90 cm",
    imagePath: firstImage,
    descriptionZh: "",
    descriptionEn: ""
  },
  {
    id: 2,
    title: "Second Work",
    titleZh: "",
    titleEn: "Second Work",
    year: "2025",
    medium: "Acrylic on linen",
    mediumZh: "",
    mediumEn: "Acrylic on linen",
    dimensions: "100 x 80 cm",
    dimensionsZh: "",
    dimensionsEn: "100 x 80 cm",
    imagePath: secondImage,
    descriptionZh: "",
    descriptionEn: ""
  }
];

const result = writeApplicationPackage(opportunity, {
  draftZh: "中文审核摘要",
  draftEn: "Formal answer.",
  checklist: "Portfolio PDF",
  selectedWorks: "",
  externalApplicationAnswersEn: "Formal answer.",
  portfolioWebResearchReferences: ["reference one", "reference two", "reference three"]
}, {
  runMode: "test",
  materialSources: [{
    kind: "portfolio",
    title: "Existing portfolio",
    fileName: "portfolio.txt",
    filePath: "portfolio.txt",
    content: "Second Work\nFirst Work",
    analysis: ""
  }],
  profile,
  works
});

const manifestPath = path.join(result.folder, "package-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const qualityReport = JSON.parse(fs.readFileSync(path.join(result.folder, "internal-notes", "quality-report.json"), "utf8"));
assert.equal(manifest.portfolio.targetPages, 20);
assert.equal(manifest.portfolio.minimumPages, 16);
assert.equal(manifest.portfolio.maximumPages, 24);
assert.ok(fs.existsSync(path.join(result.folder, "internal-notes", "portfolio-auto-repair-log.json")));
assert.ok(fs.existsSync(path.join(result.folder, "external-submission", "portfolio.html")));
assert.ok(fs.existsSync(path.join(result.folder, "external-submission", "portfolio.pdf")));
assert.ok(fs.existsSync(path.join(result.folder, "external-submission", "portfolio-short-10p.pdf")));
assert.ok(fs.existsSync(path.join(result.folder, "external-submission", "combined-application-package.pdf")));
assert.ok(fs.existsSync(path.join(result.folder, "external-submission", "images-for-upload", "file-checklist.md")));
assert.ok(manifest.portfolio.selectedImages.length >= 2);
assert.ok(manifest.portfolio.imageCopyMap.length >= 2);
assert.equal(new Set(manifest.portfolio.imageCopyMap.map((item) => item.targetFileName)).size, manifest.portfolio.imageCopyMap.length);
assert.ok(manifest.portfolio.imageCopyMap.every((item) => /image-[a-f0-9]{10}\.jpg$/.test(item.targetFileName)));
assert.ok(manifest.portfolio.variants.some((variant) => variant.type === "short_pdf" && variant.status === "generated"));
assert.ok(manifest.portfolio.variants.some((variant) => variant.type === "images_for_upload" && variant.status === "generated"));
assert.ok(manifest.portfolio.variants.some((variant) => variant.type === "combined_pdf" && variant.status === "generated"));
assert.ok(manifest.portfolio.pdf.endsWith("portfolio.pdf"));
assert.ok(manifest.portfolio.visualReport.aestheticDiagnostics);
assert.ok(manifest.portfolio.visualReport.aestheticDiagnostics.layoutStrategyCount >= 5);
assert.ok(manifest.portfolio.visualReport.aestheticDiagnostics.longestLayoutRun <= 3);
assert.ok(manifest.portfolio.visualReport.layoutStrategyCounts);
assert.ok(manifest.portfolio.visualReport.themeCounts);
assert.ok(Array.isArray(manifest.portfolio.visualReport.repeatedLayoutRuns));
assert.ok(Array.isArray(manifest.portfolio.visualReport.pageScreenshots));
assert.ok(manifest.portfolio.visualReport.pageScreenshots.length >= manifest.portfolio.actualPageCount);
assert.ok(manifest.portfolio.visualReport.pageScreenshots.every((screenshotPath) => fs.existsSync(path.join(result.folder, "internal-notes", screenshotPath))));
if (manifest.portfolio.themeUsed && manifest.portfolio.themeUsed !== "quiet_white") {
  const firstScreenshotPath = path.join(result.folder, "internal-notes", manifest.portfolio.visualReport.pageScreenshots[0]);
  const screenshotStats = await sharp(firstScreenshotPath).stats();
  const averageChannel = screenshotStats.channels.slice(0, 3).reduce((sum, channel) => sum + channel.mean, 0) / 3;
  assert.ok(averageChannel < 248, "non-white portfolio theme should preserve a visible page background in screenshots/PDF output");
}
assert.ok(Array.isArray(manifest.portfolio.visualReport.smallImagePages));
assert.ok(Array.isArray(manifest.portfolio.visualReport.captionIssues));
assert.ok(Number.isInteger(manifest.portfolio.visualReport.aestheticScore));
assert.ok(Number.isInteger(manifest.portfolio.visualReport.professionalPdfScore));
assert.ok(manifest.portfolio.layoutStrategyCounts);
assert.ok(Number.isInteger(manifest.portfolio.aestheticScore));
assert.ok(Number.isInteger(manifest.portfolio.professionalPdfScore));
assert.ok(["quality_blocked", "package_ready_for_final_review"].includes(manifest.status));
assert.doesNotMatch(fs.readFileSync(path.join(result.folder, "external-submission", "portfolio.html"), "utf8"), /\b(mock|draft|placeholder|unknown|N\/A|TBD|dimensions recorded in source material)\b/i);

const plan = JSON.parse(fs.readFileSync(path.join(result.folder, "internal-notes", "portfolio-plan.json"), "utf8"));
assert.ok(plan.designSystem);
assert.ok(["quiet_white", "warm_archive", "soft_gray_gallery", "dark_installation", "image_research_bluegray", "painting_color_field"].includes(plan.designSystem.themeName));
const sourceAudit = JSON.parse(fs.readFileSync(path.join(result.folder, "internal-notes", "portfolio-source-audit.json"), "utf8"));
assert.ok(sourceAudit.imageAnalyses.length >= 2);
assert.ok(sourceAudit.imageAnalyses.every((analysis) => analysis.orientation && Array.isArray(analysis.recommendedRoles)));

if (manifest.portfolio.actualPageCount < 16) {
  assert.equal(manifest.status, "quality_blocked");
  assert.ok(manifest.portfolio.blockingIssues.some((issue) => issue.code === "page_count_too_low"));
  assert.equal(qualityReport.passed, false);
  assert.ok(qualityReport.internalIssues.some((issue) => issue.includes("Portfolio final visual/aesthetic gate did not pass.")));
}

await fs.promises.rm(firstDir, { recursive: true, force: true });
await fs.promises.rm(secondDir, { recursive: true, force: true });
