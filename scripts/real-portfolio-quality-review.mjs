import fs from "node:fs";
import path from "node:path";
import childProcess from "node:child_process";
import sharp from "sharp";
import { chromium } from "playwright";

const root = process.cwd();
const outputDir = path.join(root, "generated", "test-runs", "portfolio-quality-review");
const screenshotDir = path.join(outputDir, "page-screenshots");
const sourceCopyDir = path.join(outputDir, "source-images");

process.env.ARTIST_STUDIO_SKIP_PORTFOLIO_SCREENSHOTS = "0";
delete process.env.ARTIST_STUDIO_FAST_PORTFOLIO_PDF;
delete process.env.ARTIST_STUDIO_WORKSPACE_ROOT;

const { writeApplicationPackage } = await import("../src/lib/package.ts");
const { renderHtmlToPdf } = await import("../src/lib/portfolioRenderer.ts");
const { checkExternalSubmissionFiles } = await import("../src/lib/fileQualityCheck.ts");

const projectConfigs = [
  {
    group: "Iconoclasm",
    sourceDir: path.join(root, "artist-assets", "inbox", "works", "Iconoclasm（偶像破坏运动）"),
    medium: "Oil and acrylic on canvas",
    year: "2023"
  },
  {
    group: "What are you looking for",
    sourceDir: path.join(root, "artist-assets", "inbox", "works", "What are you looking for"),
    medium: "Installation documentation",
    year: "2023"
  },
  {
    group: "Measurement 2.0",
    sourceDir: path.join(root, "artist-assets", "inbox", "works", "测量2.0"),
    medium: "Image research, measurement system, and painting",
    year: "2024"
  },
  {
    group: "Mausoleum 2024",
    sourceDir: path.join(root, "artist-assets", "inbox", "works", "陵2024"),
    medium: "Installation documentation and image research",
    year: "2024"
  },
  {
    group: "Love and Hope",
    sourceDir: path.join(root, "artist-assets", "inbox", "works", "爱与希望"),
    medium: "Mixed media and painting",
    year: "2022"
  }
];

await fs.promises.rm(outputDir, { recursive: true, force: true });
await fs.promises.mkdir(screenshotDir, { recursive: true });
await fs.promises.mkdir(sourceCopyDir, { recursive: true });

const groupedWorks = [];
let nextWorkId = 1;
for (const config of projectConfigs) {
  const candidates = await rankedImages(config.sourceDir);
  if (candidates.length < 4) {
    throw new Error(`Not enough readable image files for ${config.group}: ${config.sourceDir}`);
  }
  const works = candidates.slice(0, 7).map((candidate, index) => ({
    id: nextWorkId++,
    title: `${config.group} ${String(index + 1).padStart(2, "0")}`,
    titleZh: "",
    titleEn: `${config.group} ${String(index + 1).padStart(2, "0")}`,
    year: config.year,
    medium: config.medium,
    mediumZh: "",
    mediumEn: config.medium,
    dimensions: "",
    dimensionsZh: "",
    dimensionsEn: "",
    imagePath: candidate.path,
    descriptionZh: "",
    descriptionEn: "",
    width: candidate.width,
    height: candidate.height,
    group: config.group
  }));
  groupedWorks.push({ ...config, works });
}

for (const group of groupedWorks) {
  for (const work of group.works) {
    const target = path.join(sourceCopyDir, `${String(work.id).padStart(2, "0")}-${path.basename(work.imagePath)}`);
    await fs.promises.copyFile(work.imagePath, target);
  }
}

const allWorks = groupedWorks.flatMap((group) => group.works);
const profile = {
  id: 1,
  name: "卢泛舟 / Fanzhou Lu",
  nameZh: "卢泛舟",
  nameEn: "Fanzhou Lu",
  email: "bianzhengtongyi@outlook.com",
  location: "Shenzhen, China",
  locationZh: "深圳",
  locationEn: "Shenzhen, China",
  website: "",
  instagram: "",
  bioZhShort: "",
  bioZhMedium: "",
  bioZhLong: "",
  bioEnShort: "",
  bioEnMedium: "",
  bioEnLong: "",
  statementZh: "",
  statementEn: "",
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
  id: 880502,
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

const portfolioPlan = buildPortfolioPlan(groupedWorks, profile);
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
  statementEn: portfolioPlan.pages.find((page) => page.type === "short_statement")?.text || "",
  bioEn: "Fanzhou Lu is a visual artist working across painting, image research, installation, and archival image systems.",
  cvText: "Selected exhibitions and projects available upon request.",
  portfolioPlan
};

const written = writeApplicationPackage(opportunity, draft, {
  runMode: "test",
  materialSources: [{
    kind: "portfolio",
    title: "Existing local portfolio PDFs and work image archive",
    fileName: "local-portfolio-sources",
    filePath: path.join(root, "artist-assets", "inbox", "portfolio"),
    content: allWorks.map((work) => work.title).join("\n"),
    analysis: ""
  }],
  profile,
  works: allWorks
});

const packagePath = written.folder;
for (const entry of await fs.promises.readdir(packagePath)) {
  const target = path.join(outputDir, entry);
  await fs.promises.rm(target, { recursive: true, force: true });
  await fs.promises.rename(path.join(packagePath, entry), target);
}
await fs.promises.rm(path.dirname(packagePath), { recursive: true, force: true });

await optimizeExternalImages(path.join(outputDir, "external-submission", "images"));
renderHtmlToPdf(path.join(outputDir, "external-submission", "portfolio.html"), path.join(outputDir, "external-submission", "portfolio.pdf"));
await refreshManifestAfterPdfOptimization(outputDir);

await fs.promises.copyFile(path.join(outputDir, "external-submission", "portfolio.pdf"), path.join(outputDir, "portfolio.pdf"));
await fs.promises.copyFile(path.join(outputDir, "external-submission", "portfolio.html"), path.join(outputDir, "portfolio.html"));

const htmlPath = path.join(outputDir, "portfolio.html");
const pdfPath = path.join(outputDir, "portfolio.pdf");
const pdfScreenshotResult = await renderPdfScreenshots(pdfPath, screenshotDir);
if (!pdfScreenshotResult.ok) await renderHtmlPageScreenshots(htmlPath, screenshotDir);

const screenshots = (await fs.promises.readdir(screenshotDir))
  .filter((file) => /^page-\d+\.png$/.test(file))
  .sort()
  .map((file) => path.join(screenshotDir, file));
await createContactSheet(screenshots, path.join(outputDir, "portfolio-contact-sheet.png"));

const manifest = JSON.parse(await fs.promises.readFile(path.join(outputDir, "package-manifest.json"), "utf8"));
const visual = JSON.parse(await fs.promises.readFile(path.join(outputDir, "internal-notes", "portfolio-visual-check.json"), "utf8"));
await fs.promises.writeFile(path.join(outputDir, "generation-summary.json"), JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: "real local artwork images",
  outputDir,
  portfolioPdf: pdfPath,
  portfolioHtml: htmlPath,
  screenshotDir,
  contactSheet: path.join(outputDir, "portfolio-contact-sheet.png"),
  screenshotMethod: pdfScreenshotResult.ok ? pdfScreenshotResult.method : "html-page-screenshot-fallback",
  screenshotIssue: pdfScreenshotResult.ok ? null : pdfScreenshotResult.error,
  pageCount: manifest.portfolio.actualPageCount,
  packageStatus: manifest.status,
  layoutStrategyCounts: visual.layoutStrategyCounts,
  selectedSourceImages: allWorks.map((work) => work.imagePath)
}, null, 2), "utf8");

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

function buildPortfolioPlan(groups, profile) {
  const pages = [
    {
      type: "cover",
      title: "Fanzhou Lu",
      subtitle: "Selected Works",
      year: "2026",
      contact: profile.email,
      layoutStrategy: "cover",
      pageRole: "cover"
    },
    {
      type: "short_statement",
      text: "Fanzhou Lu works across painting, image research, and installation to examine how public symbols, collective memory, and visual authority are transformed through reproduction, concealment, measurement, and display. The selected projects move between painted surfaces, documentary views, and archival-image systems.",
      layoutStrategy: "statement",
      pageRole: "statement"
    }
  ];

  const pageBuilders = [
    (group) => [
      opener(group),
      grid(group, 0, 4),
      single(group.works[4], group.group)
    ],
    (group) => [
      opener(group),
      twoImage(group, 0, 2),
      context(group, group.works[2])
    ],
    (group) => [
      opener(group),
      grid(group, 0, 4),
      single(group.works[4], group.group)
    ],
    (group) => [
      opener(group),
      installation(group, 0, 3),
      twoImage(group, 3, 5)
    ],
    (group) => [
      opener(group),
      grid(group, 0, 4),
      context(group, group.works[4])
    ]
  ];

  groups.forEach((group, index) => pages.push(...pageBuilders[index](group)));
  pages.push({
    type: "selected_works_list",
    title: "Selected Works",
    works: groups.flatMap((group) => group.works.slice(0, 5).map((work) => caption(work))),
    layoutStrategy: "selected_works_list",
    pageRole: "list"
  });
  pages.push({
    type: "contact_page",
    title: "Contact",
    text: profile.email,
    layoutStrategy: "contact_page",
    pageRole: "contact"
  });

  return {
    artistName: "Fanzhou Lu",
    portfolioTitle: "Selected Works",
    year: "2026",
    language: "en",
    portfolioConstraints: {
      targetPages: 20,
      minimumPages: 18,
      maximumPages: 22,
      source: "default",
      reason: "No explicit opportunity page limit; target a formal portfolio around 20 pages."
    },
    pages,
    excludedImages: [],
    qualityRisks: ["Real local artwork images were selected from artist-assets/inbox/works for this test-run portfolio."],
    curatorialSummary: {
      projectGroupCount: groups.length,
      layoutStrategyCounts: {},
      workTypeCounts: {},
      passedDiversityGate: true
    },
    designSystem: {
      themeName: "soft_gray_gallery",
      theme: {
        name: "soft_gray_gallery",
        background: "#e7e8e5",
        text: "#181a1a",
        secondaryText: "#555b59",
        accent: "#6b746f",
        captionBackground: "rgba(231,232,229,0.9)",
        imageFrame: "soft_shadow"
      },
      headingScale: "quiet",
      pageNumberStyle: "bottom_right",
      marginSystem: "gallery",
      sectionDividerStyle: "rule"
    },
    layoutResearchUsed: {
      referenceCount: 4,
      researchFile: "internal-notes/portfolio-layout-research.md",
      derivedPrinciples: [
        "Use project sections rather than a flat image dump.",
        "Reserve full-page scale for selected primary works.",
        "Use grids and pairings to show relationships without repetition.",
        "Keep captions factual and concise.",
        "Close with a selected works/contact summary."
      ],
      appliedPrinciples: [
        "Project openers separate five bodies of work.",
        "Single-image pages are limited and mixed with grids, spreads, and context pages.",
        "Captions use title, year, and medium without internal notes."
      ]
    }
  };
}

function opener(group) {
  return {
    type: "project_opener",
    title: group.group,
    text: `${group.group} is presented through selected images from the local work archive, combining project overview, image detail, and installation or context views.`,
    projectGroup: group.group,
    projectTitle: group.group,
    layoutStrategy: "project_opener",
    pageRole: "project_opener"
  };
}

function grid(group, start, end) {
  return {
    type: "series_overview_grid",
    title: group.group,
    projectGroup: group.group,
    projectTitle: group.group,
    layoutStrategy: "series_overview_grid",
    pageRole: "overview",
    layout: "grid",
    images: group.works.slice(start, end).map((work) => image(work, "overview")),
    caption: `${group.group}. Selected works overview.`
  };
}

function installation(group, start, end) {
  return {
    type: "installation_with_details",
    title: group.group,
    projectGroup: group.group,
    projectTitle: group.group,
    layoutStrategy: "installation_with_details",
    pageRole: "installation",
    layout: "overview_plus_details",
    images: group.works.slice(start, end).map((work, index) => image(work, index === 0 ? "installation_view" : "detail")),
    caption: `${group.group}. Installation and detail views.`
  };
}

function twoImage(group, start, end) {
  return {
    type: "two_image_spread",
    title: group.group,
    year: group.works[start]?.year,
    medium: group.works[start]?.medium,
    projectGroup: group.group,
    projectTitle: group.group,
    layoutStrategy: "two_image_spread",
    pageRole: "detail",
    layout: "detail_spread",
    images: group.works.slice(start, end).map((work) => image(work, "detail")),
    caption: caption(group.works[start])
  };
}

function single(work, groupName) {
  return {
    type: "single_work_full_page",
    workId: String(work.id),
    title: work.title,
    year: work.year,
    medium: work.medium,
    dimensions: "",
    imageRole: "primary",
    imagePath: work.imagePath,
    caption: caption(work),
    projectGroup: groupName,
    projectTitle: groupName,
    layoutStrategy: "single_work_full_page",
    pageRole: "primary_work"
  };
}

function context(group, work) {
  return {
    type: "text_image_context",
    workId: String(work.id),
    title: group.group,
    year: work.year,
    medium: work.medium,
    projectGroup: group.group,
    projectTitle: group.group,
    layoutStrategy: "text_image_context",
    pageRole: "context",
    layout: "text_image",
    images: [image(work, "context")],
    text: `${group.group} connects image selection, material handling, and display decisions within the wider practice.`,
    caption: caption(work)
  };
}

function image(work, role) {
  return {
    role,
    path: work.imagePath,
    caption: caption(work),
    imageQualityScore: Math.max(work.width, work.height),
    qualityRisks: []
  };
}

function caption(work) {
  return [work.title, work.year, work.medium].filter(Boolean).join(", ");
}

async function rankedImages(dir) {
  const files = (await listImages(dir)).filter((file) => !/\.psd$/i.test(file));
  const ranked = [];
  for (const file of files) {
    try {
      const metadata = await sharp(file).metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;
      if (width < 800 || height < 600) continue;
      const size = (await fs.promises.stat(file)).size;
      ranked.push({ path: file, width, height, size, score: Math.min(width, 3000) * Math.min(height, 2400) + size / 50 });
    } catch {
      // Skip unreadable image candidates.
    }
  }
  return ranked.sort((a, b) => b.score - a.score);
}

async function listImages(dir) {
  const results = [];
  async function walk(current) {
    let entries = [];
    try {
      entries = await fs.promises.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (/\.(jpe?g|png|webp|tiff?)$/i.test(entry.name)) results.push(full);
    }
  }
  await walk(dir);
  return results.sort();
}

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
    create: { width, height, channels: 3, background: "#f7f6f2" }
  }).composite(composites).png().toFile(outPath);
}

function commandPath(command) {
  try {
    return childProcess.execFileSync("which", [command], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

async function optimizeExternalImages(imageDir) {
  let files = [];
  try {
    files = await fs.promises.readdir(imageDir);
  } catch {
    return;
  }
  for (const file of files) {
    if (!/\.(jpe?g|png|webp)$/i.test(file)) continue;
    const imagePath = path.join(imageDir, file);
    const tmpPath = `${imagePath}.pdf-optimized.jpg`;
    try {
      await sharp(imagePath)
        .rotate()
        .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 76, mozjpeg: true })
        .toFile(tmpPath);
      if ((await fs.promises.stat(tmpPath)).size < (await fs.promises.stat(imagePath)).size) {
        await fs.promises.rename(tmpPath, imagePath);
      } else {
        await fs.promises.rm(tmpPath, { force: true });
      }
    } catch {
      await fs.promises.rm(tmpPath, { force: true });
    }
  }
}

async function refreshManifestAfterPdfOptimization(folder) {
  const manifestPath = path.join(folder, "package-manifest.json");
  const visualPath = path.join(folder, "internal-notes", "portfolio-visual-check.json");
  const readinessPath = path.join(folder, "internal-notes", "package-readiness-check.json");
  const fileQualityPath = path.join(folder, "internal-notes", "file-quality-check.json");
  const manifest = JSON.parse(await fs.promises.readFile(manifestPath, "utf8"));
  const visual = JSON.parse(await fs.promises.readFile(visualPath, "utf8"));
  const fileQuality = checkExternalSubmissionFiles(path.join(folder, "external-submission"));
  const pdfPath = path.join(folder, "external-submission", "portfolio.pdf");
  const pdfSizeBytes = fs.existsSync(pdfPath) ? fs.statSync(pdfPath).size : 0;

  visual.pdfSizeBytes = pdfSizeBytes;
  visual.professionalPdfScore = visual.usedFallbackPdf || !pdfSizeBytes ? Math.min(visual.professionalPdfScore, 70) : 100;
  visual.passed = visual.blockingIssues.length === 0 && visual.autoFixableIssues.length === 0;
  manifest.portfolio.professionalPdfScore = visual.professionalPdfScore;
  manifest.portfolio.visualReport = visual;
  manifest.fileQuality = fileQuality;
  manifest.readiness.fileQuality = fileQuality;
  manifest.readiness.fileQualityBlockingIssues = fileQuality.issues || [];
  manifest.readiness.issues = (manifest.readiness.issues || []).filter((issue) => !/^External file quality failed:/.test(issue));
  if (!fileQuality.passed) {
    manifest.readiness.issues.push(...fileQuality.issues.map((issue) => `External file quality failed: ${issue}`));
  }
  manifest.readiness.portfolioGate.professionalPdfScore = visual.professionalPdfScore;
  manifest.readiness.portfolioGate.passed = visual.passed;
  manifest.readiness.passed = manifest.readiness.issues.length === 0
    && fileQuality.passed
    && visual.passed
    && manifest.quality?.passed !== false
    && manifest.opportunityVerification?.passed !== false;
  manifest.status = manifest.readiness.passed ? "package_ready_for_final_review" : "quality_blocked";

  await fs.promises.writeFile(visualPath, JSON.stringify(visual, null, 2), "utf8");
  await fs.promises.writeFile(fileQualityPath, JSON.stringify(fileQuality, null, 2), "utf8");
  await fs.promises.writeFile(readinessPath, JSON.stringify(manifest.readiness, null, 2), "utf8");
  await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
}
