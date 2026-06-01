import fs from "node:fs";
import path from "node:path";
import type { Opportunity, SourceMaterial } from "@/types/domain";

type PortfolioRenderInput = {
  externalDir: string;
  internalDir: string;
  opportunity: Opportunity;
  selectedWorks: string;
  portfolioText: string;
  existingPortfolioSources: string[];
  webResearchReferences: string[];
  materialSources: Pick<SourceMaterial, "kind" | "title" | "fileName" | "filePath" | "content" | "analysis">[];
};

type PortfolioWork = {
  title: string;
  imagePath: string;
  caption: string;
};

export function renderPortfolioPackage(input: PortfolioRenderInput) {
  const works = parseSelectedWorks(input.selectedWorks);
  const visualReport = buildVisualStructureReport(input, works);
  const html = renderPortfolioHtml(input, works);
  const htmlPath = path.join(input.externalDir, "portfolio.html");
  const reportPath = path.join(input.internalDir, "portfolio-visual-check.json");
  fs.writeFileSync(htmlPath, html, "utf8");
  fs.writeFileSync(reportPath, JSON.stringify(visualReport, null, 2), "utf8");
  const pdfPath = tryRenderPortfolioPdf(htmlPath, input.externalDir);
  return { htmlPath, pdfPath, visualReport };
}

function parseSelectedWorks(selectedWorks: string) {
  return selectedWorks
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const imagePath = line.match(/Image:\s*(.+)$/i)?.[1]?.trim() || "";
      const title = line.replace(/Image:\s*.+$/i, "").replace(/^[-*]\s*/, "").replace(/[.,，。]\s*$/, "").trim();
      return {
        title: title || path.basename(imagePath) || "Untitled",
        imagePath,
        caption: title || path.basename(imagePath) || ""
      };
    });
}

function buildVisualStructureReport(input: PortfolioRenderInput, works: PortfolioWork[]) {
  const issues: string[] = [];
  const longCaptions = works.filter((work) => work.caption.length > 180).map((work) => work.title);
  const existingPortfolioCount = input.existingPortfolioSources.length;
  const researchReferenceCount = input.webResearchReferences.length;
  const imageCount = works.filter((work) => work.imagePath).length;

  if (works.length === 0) issues.push("No selected works were provided for portfolio layout.");
  if (imageCount === 0) issues.push("No selected work image paths were provided; portfolio cannot be visually reviewed.");
  if (existingPortfolioCount === 0) issues.push("No existing artist portfolio source was referenced before layout.");
  if (researchReferenceCount < 3) issues.push("Fewer than three portfolio design/application references were recorded.");
  if (longCaptions.length > 0) issues.push(`Captions are too long for restrained portfolio layout: ${longCaptions.join(", ")}`);
  if (works.length > 12) issues.push("Portfolio has more than 12 selected works; check density against opportunity limits.");

  return {
    checkedAt: new Date().toISOString(),
    layoutPrinciple: "restrained artist PDF; cover, concise practice text, one primary work per page, short caption rhythm, generous whitespace",
    opportunityTitle: input.opportunity.title,
    selectedWorkCount: works.length,
    selectedImageCount: imageCount,
    existingPortfolioSources: input.existingPortfolioSources,
    webResearchReferences: input.webResearchReferences,
    averageCaptionLength: works.length ? Math.round(works.reduce((sum, work) => sum + work.caption.length, 0) / works.length) : 0,
    issues,
    passed: issues.length === 0
  };
}

function renderPortfolioHtml(input: PortfolioRenderInput, works: PortfolioWork[]) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(input.opportunity.title || "Portfolio")}</title>
<style>
@page { size: A4; margin: 18mm; }
body { margin: 0; color: #1f1f1f; background: #ffffff; font-family: Arial, Helvetica, sans-serif; }
.page { min-height: 257mm; break-after: page; display: flex; flex-direction: column; justify-content: center; gap: 18mm; }
.cover h1 { font-size: 26px; font-weight: 500; margin: 0; letter-spacing: 0; }
.cover p, .statement { font-size: 11px; line-height: 1.55; max-width: 150mm; }
.work-page { justify-content: center; }
.work-image { max-width: 100%; max-height: 185mm; object-fit: contain; align-self: center; }
.caption { font-size: 9px; line-height: 1.45; color: #333; max-width: 150mm; margin-top: 7mm; }
.meta { font-size: 8px; color: #666; }
</style>
</head>
<body>
<section class="page cover">
  <div>
    <h1>${escapeHtml(input.opportunity.title || "Selected Works")}</h1>
    <p>${escapeHtml(firstParagraph(input.portfolioText) || "Selected works")}</p>
  </div>
  <p class="meta">${escapeHtml(input.opportunity.organization || "")}</p>
</section>
${works.map((work) => renderWorkPage(work)).join("\n")}
</body>
</html>
`;
}

function renderWorkPage(work: PortfolioWork) {
  const imageSrc = work.imagePath && fs.existsSync(work.imagePath)
    ? `images/${path.basename(work.imagePath)}`
    : "";
  return `<section class="page work-page">
  ${imageSrc ? `<img class="work-image" src="${escapeHtml(imageSrc)}" alt="${escapeHtml(work.title)}" />` : ""}
  <div class="caption">${escapeHtml(work.caption)}</div>
</section>`;
}

function tryRenderPortfolioPdf(htmlPath: string, externalDir: string) {
  try {
    const req = eval("require") as NodeRequire;
    req.resolve("playwright");
    const pdfPath = path.join(externalDir, "portfolio.pdf");
    const childProcess = req("node:child_process") as typeof import("node:child_process");
    const code = `
      const { chromium } = require("playwright");
      (async () => {
        const browser = await chromium.launch({ headless: true });
        try {
          const page = await browser.newPage();
          await page.goto(${JSON.stringify(`file://${htmlPath}`)}, { waitUntil: "networkidle" });
          await page.pdf({ path: ${JSON.stringify(pdfPath)}, format: "A4", printBackground: true });
        } finally {
          await browser.close();
        }
      })().catch((error) => { console.error(error); process.exit(1); });
    `;
    childProcess.execFileSync(process.execPath, ["-e", code], {
      cwd: process.cwd(),
      stdio: "ignore",
      timeout: 30000
    });
    return fs.existsSync(pdfPath) ? pdfPath : null;
  } catch {
    return null;
  }
}

function firstParagraph(text: string) {
  return text.split(/\n{2,}/).map((item) => item.trim()).find(Boolean) || "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
