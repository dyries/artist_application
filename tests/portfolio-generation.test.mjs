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
    "maxPages",
    "Fewer than three portfolio design/application references",
    "caption font is below readable size"
  ]) {
    assert.ok(renderer.includes(snippet), `visual gate missing ${snippet}`);
  }

  assert.ok(quality.includes("PortfolioPlan contains forbidden external-facing language"));
  assert.ok(quality.includes("renderer must not depend on selectedWorks free text"));
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
