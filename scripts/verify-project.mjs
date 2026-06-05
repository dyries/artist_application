import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  ".gitignore",
  ".github/workflows/checks.yml",
  "README.md",
  "docs/codex-workflow.md",
  "docs/rules.md",
  "docs/audit-report.md",
  "docs/application_rules.md",
  "docs/portfolio_generation_rules.md",
  "docs/review_policy.md",
  "docs/submission_boundary_rules.md",
  "docs/test_run_policy.md",
  "docs/automation.md",
  "docs/data-model.md",
  "WORKLOG.md",
  "docs/status-lifecycle.md",
  "docs/maintenance.md",
  "src/lib/automationRules.ts",
  "src/lib/db.ts",
  "src/lib/package.ts",
  "src/lib/opportunitySearch.ts",
  "src/lib/portfolioRenderer.ts"
];

const requiredPlaceholders = [
  "artist-assets/inbox/cv/.gitkeep",
  "artist-assets/inbox/bio/.gitkeep",
  "artist-assets/inbox/statement/.gitkeep",
  "artist-assets/inbox/portfolio/.gitkeep",
  "artist-assets/inbox/works/.gitkeep",
  "artist-assets/inbox/work-images/.gitkeep",
  "artist-assets/inbox/other/.gitkeep",
  "artist-assets/source-materials/.gitkeep",
  "artist-assets/works/.gitkeep",
  "generated/applications/.gitkeep",
  "generated/codex/.gitkeep",
  "generated/reports/.gitkeep",
  "generated/final-submissions/.gitkeep"
];

const requiredIgnoreSnippets = [
  "data/*.sqlite",
  "artist-assets/inbox/**",
  "artist-assets/source-materials/**",
  "artist-assets/works/**",
  "generated/**",
  "backups/"
];

const errors = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Missing required file: ${file}`);
}

for (const file of requiredPlaceholders) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Missing placeholder: ${file}`);
}

const gitignore = fs.readFileSync(path.join(root, ".gitignore"), "utf8");
for (const snippet of requiredIgnoreSnippets) {
  if (!gitignore.includes(snippet)) errors.push(`.gitignore is missing: ${snippet}`);
}

const dbSource = fs.readFileSync(path.join(root, "src/lib/db.ts"), "utf8");
for (const snippet of ["schema_migrations", "activity_log", "package_manifests", "run_mode", "boundary_model"]) {
  if (!dbSource.includes(snippet)) errors.push(`Database support missing: ${snippet}`);
}

const packageSource = fs.readFileSync(path.join(root, "src/lib/package.ts"), "utf8");
if (!packageSource.includes("package-manifest.json")) {
  errors.push("Application packages must write package-manifest.json");
}
for (const snippet of ["internal-notes", "user-review", "external-submission", "runApplicationQualityChecks", "renderPortfolioPackage"]) {
  if (!packageSource.includes(snippet)) errors.push(`Application package boundary missing: ${snippet}`);
}

const opportunitySearchSource = fs.readFileSync(path.join(root, "src/lib/opportunitySearch.ts"), "utf8");
for (const snippet of ["ARTIST_STUDIO_DISCOVERY_SOURCE_URLS", "discovered-opportunity-search", "runMode === \"real\""]) {
  if (!opportunitySearchSource.includes(snippet)) errors.push(`Opportunity discovery support missing: ${snippet}`);
}

const portfolioRendererSource = fs.readFileSync(path.join(root, "src/lib/portfolioRenderer.ts"), "utf8");
for (const snippet of ["portfolio.html", "portfolio.pdf", "portfolio-visual-check.json"]) {
  if (!portfolioRendererSource.includes(snippet)) errors.push(`Portfolio rendering support missing: ${snippet}`);
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Project structure verification passed.");
