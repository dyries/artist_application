import fs from "node:fs";
import path from "node:path";
import childProcess from "node:child_process";
import sharp from "sharp";
import { chromium } from "playwright";

const root = process.cwd();
const outputDir = path.join(root, "generated", "test-runs", "portfolio-quality-review");
const mockWorkspace = path.join(outputDir, "_mock-workspace");
const sourceImageDir = path.join(mockWorkspace, "artist-assets", "works", "portfolio-quality-review");
const outputSourceImageDir = path.join(outputDir, "source-images");
const screenshotDir = path.join(outputDir, "page-screenshots");

process.env.ARTIST_STUDIO_SKIP_PORTFOLIO_SCREENSHOTS = "0";
process.env.ARTIST_STUDIO_WORKSPACE_ROOT = mockWorkspace;
delete process.env.ARTIST_STUDIO_FAST_PORTFOLIO_PDF;

await fs.promises.rm(outputDir, { recursive: true, force: true });
await fs.promises.mkdir(sourceImageDir, { recursive: true });
await fs.promises.mkdir(path.join(mockWorkspace, "artist-assets", "source-materials"), { recursive: true });
await fs.promises.mkdir(path.join(mockWorkspace, "artist-assets", "inbox"), { recursive: true });
await fs.promises.mkdir(screenshotDir, { recursive: true });

const { writeApplicationPackage } = await import("../src/lib/package.ts");

const projectSpecs = [
  { project: "Iconoclasm", medium: "Oil and acrylic on canvas", base: "#7f4f43" },
  { project: "What are you looking for", medium: "Image research and print", base: "#465b63" },
  { project: "Measurement 2.0", medium: "Graphite, acrylic, and transfer on paper", base: "#8b7a55" },
  { project: "Mausoleum 2024", medium: "Installation documentation", base: "#535753" },
  { project: "Love and Hope", medium: "Mixed media on canvas", base: "#8a5f69" }
];

function svgArtwork(index, spec) {
  const width = index % 4 === 0 ? 2600 : index % 3 === 0 ? 2100 : 2400;
  const height = index % 5 === 0 ? 1600 : index % 2 === 0 ? 1800 : 2300;
  const accent = ["#d8c6a1", "#c75b45", "#1e1f1d", "#d9d7ca", "#6f7b67"][index % 5];
  const secondary = ["#ece6d8", "#a8b3ad", "#352f2a", "#b7a17d", "#f3eee3"][index % 5];
  return {
    width,
    height,
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="100%" height="100%" fill="${spec.base}"/>
        <rect x="${width * 0.08}" y="${height * 0.1}" width="${width * 0.5}" height="${height * 0.68}" fill="${secondary}" opacity="0.78"/>
        <rect x="${width * 0.18}" y="${height * 0.18}" width="${width * 0.62}" height="${height * 0.55}" fill="none" stroke="${accent}" stroke-width="${Math.max(10, width * 0.012)}"/>
        <circle cx="${width * (0.62 + (index % 3) * 0.06)}" cy="${height * (0.36 + (index % 4) * 0.05)}" r="${Math.min(width, height) * 0.12}" fill="${accent}" opacity="0.72"/>
        <path d="M ${width * 0.12} ${height * 0.82} C ${width * 0.38} ${height * 0.58}, ${width * 0.58} ${height * 0.94}, ${width * 0.9} ${height * 0.66}" fill="none" stroke="#171717" stroke-width="${Math.max(8, width * 0.008)}" opacity="0.62"/>
        <g opacity="0.5">
          ${Array.from({ length: 7 }, (_, line) => `<line x1="${width * (0.1 + line * 0.11)}" y1="${height * 0.06}" x2="${width * (0.04 + line * 0.13)}" y2="${height * 0.94}" stroke="#111" stroke-width="${Math.max(2, width * 0.002)}"/>`).join("")}
        </g>
      </svg>`
  };
}

const works = [];
for (let index = 0; index < 20; index += 1) {
  const spec = projectSpecs[index % projectSpecs.length];
  const art = svgArtwork(index, spec);
  const imagePath = path.join(sourceImageDir, `${spec.project.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${String(index + 1).padStart(2, "0")}.jpg`);
  await sharp(Buffer.from(art.svg)).jpeg({ quality: 92 }).toFile(imagePath);
  if (index < projectSpecs.length) {
    const detailPath = path.join(sourceImageDir, `${spec.project.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${String(index + 1).padStart(2, "0")}-detail-crop.jpg`);
    const processPath = path.join(sourceImageDir, `${spec.project.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${String(index + 1).padStart(2, "0")}-process-installation.jpg`);
    await sharp(Buffer.from(art.svg)).extract({ left: Math.round(art.width * 0.22), top: Math.round(art.height * 0.18), width: Math.round(art.width * 0.5), height: Math.round(art.height * 0.5) }).jpeg({ quality: 88 }).toFile(detailPath);
    await sharp(Buffer.from(art.svg)).resize({ width: 1500, height: 1000, fit: "cover" }).modulate({ brightness: 0.82 }).jpeg({ quality: 82 }).toFile(processPath);
  }
  works.push({
    id: index + 1,
    title: `${spec.project} ${String(index + 1).padStart(2, "0")}`,
    titleZh: "",
    titleEn: `${spec.project} ${String(index + 1).padStart(2, "0")}`,
    year: String(2021 + (index % 5)),
    medium: spec.medium,
    mediumZh: "",
    mediumEn: spec.medium,
    dimensions: `${70 + index * 3} x ${50 + index * 2} cm`,
    dimensionsZh: "",
    dimensionsEn: `${70 + index * 3} x ${50 + index * 2} cm`,
    imagePath,
    descriptionZh: "",
    descriptionEn: ""
  });
}

const profile = {
  id: 1,
  name: "Fanzhou Lu",
  nameZh: "卢泛舟",
  nameEn: "Fanzhou Lu",
  email: "studio@example.com",
  location: "Shanghai",
  locationZh: "上海",
  locationEn: "Shanghai",
  website: "https://example.com",
  instagram: "",
  bioZhShort: "",
  bioZhMedium: "",
  bioZhLong: "",
  bioEnShort: "",
  bioEnMedium: "",
  bioEnLong: "",
  statementZh: "",
  statementEn: "Fanzhou Lu works through painting, image research, and installation-oriented projects to examine how public symbols shift through surface, reproduction, concealment, and material attention. The practice turns familiar political and historical images into unstable arrangements of scale, color, archive, and display.",
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

const opportunity = {
  id: 880501,
  title: "Independent Residency Open Call",
  organization: "Independent Art Space",
  url: "https://example.com/residency-open-call",
  location: "International",
  deadline: "2026-12-31",
  fee: "Free",
  funding: "Studio access and curatorial meetings",
  eligibility: "International visual artists working across painting, image research, installation, and related media.",
  materials: "Submit a formal portfolio PDF, artist statement, CV, and contact details. No specific page limit is listed.",
  submissionMethod: "email",
  summary: "Portfolio-focused residency opportunity used for local quality review.",
  score: 91,
  risks: "",
  status: "selected_by_user",
  source: "local quality review",
  rawContent: [
    "Independent Art Space residency open call.",
    "Location: International.",
    "Deadline: 2026-12-31.",
    "Fee: Free.",
    "Eligibility: International visual artists.",
    "Materials: Submit a formal portfolio PDF, artist statement, CV, and contact details.",
    "Submission method: email."
  ].join("\n"),
  createdAt: "",
  updatedAt: ""
};

const draft = {
  draftZh: "中文审核摘要",
  draftEn: "Formal application answer.",
  checklist: "Portfolio PDF, artist statement, CV, and contact details.",
  selectedWorks: "",
  externalApplicationAnswersEn: "Please find the attached portfolio materials for consideration.",
  emailDraftEn: "Dear Independent Art Space,\n\nPlease find the attached portfolio materials for consideration.\n\nBest regards,\nFanzhou Lu",
  portfolioWebResearchReferences: [
    "Artists Collecting Society portfolio guide",
    "RISD graduate portfolio guidance",
    "SAIC graduate portfolio guidance",
    "UCL Slade MFA portfolio guidance"
  ],
  statementEn: profile.statementEn,
  bioEn: "Fanzhou Lu is a visual artist working across painting, image research, and installation documentation.",
  cvText: "Selected exhibitions and projects available upon request."
};

const written = writeApplicationPackage(opportunity, draft, {
  runMode: "test",
  materialSources: [{
    kind: "portfolio",
    title: "Existing portfolio order",
    fileName: "portfolio-order.txt",
    filePath: path.join(outputDir, "source-portfolio-order.txt"),
    content: works.map((work) => work.title).join("\n"),
    analysis: ""
  }],
  profile,
  works
});

const packagePath = written.folder;
await fs.promises.mkdir(outputSourceImageDir, { recursive: true });
for (const file of await fs.promises.readdir(sourceImageDir)) {
  await fs.promises.copyFile(path.join(sourceImageDir, file), path.join(outputSourceImageDir, file));
}
for (const entry of await fs.promises.readdir(packagePath)) {
  await fs.promises.rename(path.join(packagePath, entry), path.join(outputDir, entry));
}

await fs.promises.copyFile(path.join(outputDir, "external-submission", "portfolio.pdf"), path.join(outputDir, "portfolio.pdf"));
await fs.promises.copyFile(path.join(outputDir, "external-submission", "portfolio.html"), path.join(outputDir, "portfolio.html"));

const htmlPath = path.join(outputDir, "portfolio.html");
const pdfPath = path.join(outputDir, "portfolio.pdf");
const pdfScreenshotResult = await renderPdfScreenshots(pdfPath, screenshotDir);
if (!pdfScreenshotResult.ok) {
  await renderHtmlPageScreenshots(htmlPath, screenshotDir);
}

const screenshots = (await fs.promises.readdir(screenshotDir))
  .filter((file) => /^page-\d+\.png$/.test(file))
  .sort()
  .map((file) => path.join(screenshotDir, file));
await createContactSheet(screenshots, path.join(outputDir, "portfolio-contact-sheet.png"));

const manifest = JSON.parse(await fs.promises.readFile(path.join(outputDir, "package-manifest.json"), "utf8"));
const visual = JSON.parse(await fs.promises.readFile(path.join(outputDir, "internal-notes", "portfolio-visual-check.json"), "utf8"));
const plan = JSON.parse(await fs.promises.readFile(path.join(outputDir, "internal-notes", "portfolio-plan.json"), "utf8"));
const audit = JSON.parse(await fs.promises.readFile(path.join(outputDir, "internal-notes", "portfolio-source-audit.json"), "utf8"));
await fs.promises.writeFile(path.join(outputDir, "generation-summary.json"), JSON.stringify({
  generatedAt: new Date().toISOString(),
  outputDir,
  packageStatus: manifest.status,
  portfolioPdf: pdfPath,
  portfolioHtml: htmlPath,
  screenshotDir,
  contactSheet: path.join(outputDir, "portfolio-contact-sheet.png"),
  screenshotMethod: pdfScreenshotResult.ok ? pdfScreenshotResult.method : "html-page-screenshot-fallback",
  screenshotIssue: pdfScreenshotResult.ok ? null : pdfScreenshotResult.error,
  pageCount: manifest.portfolio.actualPageCount,
  layoutStrategyCounts: visual.layoutStrategyCounts,
  projectGroupCount: plan.curatorialSummary?.projectGroupCount
}, null, 2), "utf8");
const qaReport = renderQaReport({ outputDir, manifest, visual, plan, audit, screenshots, pdfPath, htmlPath, contactSheet: path.join(outputDir, "portfolio-contact-sheet.png") });
await fs.promises.writeFile(path.join(outputDir, "artist-application-portfolio-quality-review.md"), qaReport, "utf8");
await fs.promises.writeFile(path.join(root, "artist-application-portfolio-quality-review.md"), qaReport, "utf8");

console.log(JSON.stringify({
  outputDir,
  portfolioPdf: pdfPath,
  portfolioHtml: htmlPath,
  screenshotDir,
  contactSheet: path.join(outputDir, "portfolio-contact-sheet.png"),
  pageCount: manifest.portfolio.actualPageCount,
  packageStatus: manifest.status,
  screenshotMethod: pdfScreenshotResult.ok ? pdfScreenshotResult.method : "html-page-screenshot-fallback"
}, null, 2));

async function renderPdfScreenshots(pdfPath, outDir) {
  const magick = commandPath("magick");
  if (!magick) return { ok: false, error: "ImageMagick not available" };
  try {
    for (const file of await fs.promises.readdir(outDir)) {
      if (/^(page|pdf-page)-\d+\.png$/.test(file)) await fs.promises.rm(path.join(outDir, file), { force: true });
    }
    childProcess.execFileSync(magick, ["-density", "144", pdfPath, "-background", "white", "-alpha", "remove", path.join(outDir, "pdf-page-%02d.png")], {
      cwd: root,
      stdio: "pipe",
      timeout: 120000
    });
    const files = (await fs.promises.readdir(outDir)).filter((file) => /^pdf-page-\d+\.png$/.test(file)).sort();
    if (!files.length) return { ok: false, error: "ImageMagick produced no PDF page screenshots" };
    for (const file of files) {
      const match = file.match(/^pdf-page-(\d+)\.png$/);
      if (!match) continue;
      const number = Number(match[1]) + 1;
      await fs.promises.rename(path.join(outDir, file), path.join(outDir, `page-${String(number).padStart(2, "0")}.png`));
    }
    return { ok: true, method: "imagemagick-pdf-rasterize" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function renderHtmlPageScreenshots(htmlPath, outDir) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
    await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
    const pages = await page.$$(".page");
    for (let index = 0; index < pages.length; index += 1) {
      await pages[index].screenshot({ path: path.join(outDir, `page-${String(index + 1).padStart(2, "0")}.png`) });
    }
  } finally {
    await browser.close();
  }
}

async function createContactSheet(imagePaths, outPath) {
  if (!imagePaths.length) return;
  const thumbWidth = 260;
  const thumbHeight = 368;
  const padding = 28;
  const labelHeight = 30;
  const columns = 5;
  const rows = Math.ceil(imagePaths.length / columns);
  const width = columns * thumbWidth + (columns + 1) * padding;
  const height = rows * (thumbHeight + labelHeight) + (rows + 1) * padding;
  const composites = [];
  for (let index = 0; index < imagePaths.length; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const left = padding + column * (thumbWidth + padding);
    const top = padding + row * (thumbHeight + labelHeight + padding);
    const thumb = await sharp(imagePaths[index]).resize(thumbWidth, thumbHeight, { fit: "contain", background: "#f7f6f2" }).png().toBuffer();
    const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${thumbWidth}" height="${labelHeight}"><rect width="100%" height="100%" fill="#f7f6f2"/><text x="0" y="20" font-family="Arial" font-size="18" fill="#171717">Page ${String(index + 1).padStart(2, "0")}</text></svg>`);
    composites.push({ input: thumb, left, top });
    composites.push({ input: label, left, top: top + thumbHeight + 6 });
  }
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: "#f7f6f2"
    }
  }).composite(composites).png().toFile(outPath);
}

function commandPath(command) {
  try {
    return childProcess.execFileSync("which", [command], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function renderQaReport({ outputDir, manifest, visual, audit, screenshots, pdfPath, htmlPath, contactSheet }) {
  const primaryRows = (audit.projectGroupPrimaryImages || []).map((group) => `- ${group.projectGroup}: ${group.primaryImagePath || "quality_blocked"} | complete image available: ${group.completeImageAvailable ? "yes" : "no"} | ${group.reason || ""}`);
  const excludedRows = (audit.excludedImages || [])
    .filter((image) => /detail|crop|process|install|installation|temporary|archive|reference|packing|studio|screenshot|partial/i.test(`${image.path} ${(image.risks || []).join(" ")}`))
    .slice(0, 40)
    .map((image) => `- ${image.path} | role: ${image.assignedRole || image.recommendedRole || "support"} | reason: ${image.excludedReason || "not selected"}`);
  const supportRows = (audit.supportOnlyImages || [])
    .slice(0, 40)
    .map((image) => `- ${image.path} | group: ${image.projectGroup || ""} | reason: ${image.reason}`);
  const supportMainUses = (audit.selectedImages || []).filter((image) => image.supportOnly && (image.use === "primary" || image.use === "overview"));
  return [
    "# Artist Application Portfolio Quality Review",
    "",
    `Review time: ${new Date().toISOString()}`,
    "",
    "## Output Paths",
    "",
    `- Portfolio PDF: \`${pdfPath}\``,
    `- Portfolio HTML: \`${htmlPath}\``,
    `- Page screenshots: \`${path.join(outputDir, "page-screenshots")}\``,
    `- Contact sheet: \`${contactSheet}\``,
    `- Source audit: \`${path.join(outputDir, "internal-notes", "portfolio-source-audit.json")}\``,
    `- Portfolio plan: \`${path.join(outputDir, "internal-notes", "portfolio-plan.json")}\``,
    `- Visual check: \`${path.join(outputDir, "internal-notes", "portfolio-visual-check.json")}\``,
    `- Auto-repair log: \`${path.join(outputDir, "internal-notes", "portfolio-auto-repair-log.json")}\``,
    "",
    "## Generation Summary",
    "",
    `- PDF pages: ${manifest.portfolio.actualPageCount}`,
    `- Screenshot count: ${screenshots.length}`,
    `- Package status: \`${manifest.status}\``,
    `- Visual gate passed: ${visual.passed ? "yes" : "no"}`,
    `- Aesthetic score: ${visual.aestheticScore}`,
    `- Professional PDF score: ${visual.professionalPdfScore}`,
    `- Final decision: \`${manifest.status === "package_ready_for_final_review" ? "package_ready_for_final_review" : "quality_blocked"}\``,
    manifest.status === "quality_blocked" ? `- Blocked reasons: ${manifest.readiness?.issues?.join("; ") || "see internal notes"}` : "- Blocked reasons: none",
    "",
    "## Project Group Primary Images",
    "",
    primaryRows.length ? primaryRows.join("\n") : "- No project primary images recorded.",
    "",
    "## Incomplete Images Excluded",
    "",
    excludedRows.length ? excludedRows.join("\n") : "- No incomplete/detail/process/installation images were selected as exclusions in this run.",
    "",
    "## Support/Context Images",
    "",
    supportRows.length ? supportRows.join("\n") : "- No support-only images recorded.",
    "",
    "## Main Image Leak Check",
    "",
    `- Support-only images used as primary/overview: ${supportMainUses.length}`,
    supportMainUses.length ? supportMainUses.map((image) => `- ${image.path} on page ${image.page}`).join("\n") : "- None.",
    "",
    "## Mandatory Rule Result",
    "",
    `- Complete artwork images used for project primary slots: ${(audit.projectGroupPrimaryImages || []).every((group) => group.primaryImagePath && group.completeImageAvailable) ? "yes" : "no"}`,
    `- Detail/crop/process/installation images blocked from single_work_full_page: ${visual.blockingIssues?.some((issue) => /single_work_full_page|support_only|incomplete/i.test(issue.code)) ? "failed" : "passed"}`,
    `- Portfolio status: \`${manifest.status}\``
  ].join("\n");
}
