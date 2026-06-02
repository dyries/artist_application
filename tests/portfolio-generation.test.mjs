import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const readText = (filePath) => fs.readFileSync(filePath, "utf8");

test("portfolio generation uses source audit and structured PortfolioPlan", () => {
  const packageWriter = readText("src/lib/package.ts");
  const renderer = readText("src/lib/portfolioRenderer.ts");
  const schemas = readText("src/lib/schemas.ts");

  for (const snippet of [
    "portfolio-source-audit.json",
    "portfolio-plan.json",
    "portfolio-auto-repair-log.json",
    "buildAutomaticPortfolioPlan",
    "generatePortfolioWithAutoRepair",
    "buildPortfolioSourceAudit",
    "copyPortfolioPlanImages",
    "PortfolioPlan"
  ]) {
    assert.ok(packageWriter.includes(snippet), `package writer missing ${snippet}`);
  }

  assert.ok(renderer.includes("plan: PortfolioPlan"));
  assert.ok(renderer.includes("work_full_page"));
  assert.ok(renderer.includes("installation_spread"));
  assert.ok(renderer.includes("series_grid"));
  assert.ok(!renderer.includes("parseSelectedWorks("));

  assert.ok(schemas.includes("portfolioPlanSchema"));
  assert.ok(schemas.includes("portfolioSourceAudit"));
  assert.ok(schemas.includes("selectedWorksStructured"));
});

test("portfolio image handling is fail-closed and visually gated", () => {
  const packageWriter = readText("src/lib/package.ts");
  const renderer = readText("src/lib/portfolioRenderer.ts");
  const quality = readText("src/lib/portfolioQualityCheck.ts");

  for (const snippet of [
    "resolveAllowedImagePath",
    "readImageMetadata",
    "Portfolio image is missing or outside allowed directories",
    "Portfolio image cannot be read by sharp",
    "PortfolioPlan references no formal image paths"
  ]) {
    assert.ok(packageWriter.includes(snippet), `fail-closed image handling missing ${snippet}`);
  }

  for (const snippet of [
    "forbiddenExternalPattern",
    "targetFileSizeMb",
    "autoFixableIssues",
    "blockingIssues",
    "warnings",
    "caption font is below readable size",
    "small_full_page_image"
  ]) {
    assert.ok(renderer.includes(snippet), `visual gate missing ${snippet}`);
  }

  assert.ok(quality.includes("PortfolioPlan contains forbidden external-facing language"));
  assert.ok(quality.includes("warnings"));
  assert.ok(quality.includes("\"images\" in page"));
  assert.ok(quality.includes("renderer must not depend on selectedWorks free text"));
});

test("portfolio automation defaults to 20 pages and repairs ordinary issues", () => {
  const packageWriter = readText("src/lib/package.ts");
  const renderer = readText("src/lib/portfolioRenderer.ts");
  const imageAnalysis = readText("src/lib/portfolioImageAnalysis.ts");
  const projectAutomation = readText("src/lib/projectAutomation.ts");
  const schemas = readText("src/lib/schemas.ts");
  const qualityChecks = readText("src/lib/qualityChecks.ts");

  for (const snippet of [
    "targetPages: 20",
    "minimumPages: 16",
    "maximumPages: 24",
    "inferPortfolioConstraints",
    "repairPortfolioPlan",
    "round <= 3",
    "autoFixableIssuesResolved",
    "selectedImages",
    "excludedImages",
    "stablePortfolioImageName",
    "portfolio-image-copy-map.json",
    "materializePortfolioVariants",
    "portfolio-short-10p",
    "images-for-upload",
    "requiresImageUploadOnly",
    "individual image upload rather than a formal portfolio PDF",
    "combined-application-package.pdf",
    "inferExistingPortfolioTitleOrder",
    "fallbackImageWorks",
    "extractPortfolioBody",
    "fileQualityBlockingIssues",
    "external_file_quality_warning"
  ]) {
    assert.ok(packageWriter.includes(snippet), `package automation missing ${snippet}`);
  }

  assert.ok(!packageWriter.includes("availableWorks.filter((work) => work.imagePath).slice(0, 8)"));
  assert.ok(packageWriter.includes("Generated combined application PDF from external submission text files and portfolio pages."));
  assert.ok(packageWriter.includes("longSide >= 2400"));
  assert.ok(packageWriter.includes("extractSelectedPortfolioImages"));
  assert.ok(packageWriter.includes("materialsActuallyUsed"));
  assert.ok(renderer.includes("page_count_too_low"));
  assert.ok(renderer.includes("aestheticScore"));
  assert.ok(renderer.includes("professionalPdfScore"));
  assert.ok(renderer.includes("pageScreenshots"));
  assert.ok(renderer.includes("portfolio-page-screenshots"));
  assert.ok(renderer.includes("layoutStrategyCounts"));
  assert.ok(renderer.includes("repeatedLayoutRuns"));
  assert.ok(renderer.includes("fallback_pdf_not_professional"));
  assert.ok(imageAnalysis.includes("sharp"));
  assert.ok(imageAnalysis.includes("recommendedRoles"));
  assert.ok(packageWriter.includes("imageAnalyses"));
  assert.ok(renderer.includes("page_count_too_high"));
  assert.ok(renderer.includes("caption_too_long"));
  assert.ok(renderer.includes("statement_too_generic"));
  assert.ok(renderer.includes("series_grid_too_dense"));
  assert.ok(renderer.includes("duplicate_images"));
  assert.ok(renderer.includes("no_usable_images"));
  assert.ok(renderer.includes("renderFallbackPdfFromHtml"));
  assert.ok(renderer.includes("writeSimplePdf"));
  assert.ok(packageWriter.includes("portfolioVisualReport: lastRender.visualReport"));
  assert.ok(qualityChecks.includes("Portfolio final visual/aesthetic gate did not pass."));
  assert.ok(projectAutomation.includes("professional artist portfolio editor"));
  assert.ok(projectAutomation.includes("portfolioConstraints"));
  assert.ok(projectAutomation.includes("autoRepairIntent"));
  assert.ok(schemas.includes("portfolioVariants"));
});

test("portfolio generation requires layout research and project diversity", () => {
  const packageWriter = readText("src/lib/package.ts");
  const renderer = readText("src/lib/portfolioRenderer.ts");
  const schemas = readText("src/lib/schemas.ts");
  const projectAutomation = readText("src/lib/projectAutomation.ts");

  for (const snippet of [
    "portfolio-layout-research.md",
    "portfolio-layout-research.json",
    "performPortfolioLayoutResearch",
    "Live web research unavailable in this environment.",
    "no URLs were fabricated",
    "layoutResearchUsed",
    "appliedPrinciples"
  ]) {
    assert.ok(packageWriter.includes(snippet) || schemas.includes(snippet) || projectAutomation.includes(snippet), `layout research missing ${snippet}`);
  }

  for (const snippet of [
    "portfolioCuratorialGate",
    "projectGroupCount",
    "dominantProjectPageRatio",
    "dominant_project_over_35_percent",
    "project_diversity_too_low",
    "single_project_selected_works",
    "curatorial_gate_failed",
    "passedDiversityGate"
  ]) {
    assert.ok(packageWriter.includes(snippet) || renderer.includes(snippet) || schemas.includes(snippet), `curatorial gate missing ${snippet}`);
  }

  for (const snippet of [
    "project_opener",
    "series_overview_grid",
    "single_work_full_page",
    "two_image_spread",
    "installation_with_details",
    "image_research_grid",
    "text_image_context",
    "selected_works_list",
    "contact_page"
  ]) {
    assert.ok(packageWriter.includes(snippet) && renderer.includes(snippet) && schemas.includes(snippet), `layout strategy missing ${snippet}`);
  }

  assert.ok(projectAutomation.includes("Before creating any portfolioPlan, perform online portfolio layout research"));
  assert.ok(projectAutomation.includes("More than four consecutive single_work_full_page pages is a failure"));
  assert.ok(projectAutomation.includes("35%"));
});

test("machine rules describe auto repair instead of blocking ordinary portfolio problems", () => {
  const automationRules = readText("src/lib/automationRules.ts");

  assert.ok(automationRules.includes("targetPages 20"));
  assert.ok(automationRules.includes("auto-repair loop for up to three rounds"));
  assert.ok(automationRules.includes("Only true blocking issues"));
  assert.ok(!automationRules.includes("image failure must quality_block"));
});

test("user review does not send ordinary portfolio issues back to the artist", () => {
  const packageWriter = readText("src/lib/package.ts");

  assert.ok(packageWriter.includes("系统已自动完成作品集排版与质量检查"));
  assert.ok(packageWriter.includes("系统无法自动解决以下关键问题，需要用户确认"));
  assert.ok(!packageWriter.includes("未通过，需先处理 internal-notes/internal-issues.md"));
});

test("portfolio rules document real submission portfolio boundaries", () => {
  const portfolioRules = readText("docs/portfolio_generation_rules.md");
  const projectRules = readText("docs/rules.md");
  const automationRules = readText("src/lib/automationRules.ts");

  for (const snippet of [
    "PortfolioPlan",
    "portfolio-source-audit.json",
    "artist name",
    "quality_blocked",
    "sharp"
  ]) {
    assert.ok(portfolioRules.includes(snippet) || projectRules.includes(snippet) || automationRules.includes(snippet), `rules missing ${snippet}`);
  }
});
