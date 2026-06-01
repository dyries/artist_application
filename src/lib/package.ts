import fs from "node:fs";
import path from "node:path";
import childProcess from "node:child_process";
import { generatedApplicationsDir, projectRoot, materialsInboxDir, sourceMaterialsDir, worksDir } from "./paths";
import { writeGeneratedDocuments } from "./documentOutputs";
import { runApplicationQualityChecks } from "./qualityChecks";
import { sanitizeExternalText } from "./outputSanitizer";
import { renderPortfolioPackage } from "./portfolioRenderer";
import { checkExternalSubmissionFiles } from "./fileQualityCheck";
import type { Application, ArtistProfile, AutomationRunMode, Opportunity, PortfolioPlan, PortfolioPlanPage, PortfolioSourceAudit, SourceMaterial, Work } from "@/types/domain";

export type PackageDraft = Pick<Application, "draftZh" | "draftEn" | "checklist" | "selectedWorks"> & {
  internalNotes?: string;
  userReviewZh?: string;
  chineseReviewSummary?: string;
  externalApplicationAnswersEn?: string;
  externalApplicationAnswersZh?: string;
  emailDraftEn?: string;
  emailDraftZh?: string;
  portfolioText?: string;
  portfolioWebResearchReferences?: string[];
  bioZh?: string;
  bioEn?: string;
  statementZh?: string;
  statementEn?: string;
  cvText?: string;
  portfolioPlan?: PortfolioPlan;
  portfolioSourceAudit?: PortfolioSourceAudit;
  selectedWorksStructured?: Array<{ workId?: number | string; title: string; imagePath?: string; role?: string; reason?: string }>;
  excludedWorksOrImages?: Array<{ id?: number | string; path?: string; reason: string }>;
  missingMetadata?: string[];
  portfolioQualityRisks?: string[];
};

type WritePackageOptions = {
  runMode: AutomationRunMode;
  materialSources: Pick<SourceMaterial, "kind" | "title" | "fileName" | "filePath" | "content" | "analysis">[];
  profile?: ArtistProfile;
  works?: Work[];
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "application";
}

export function writeApplicationPackage(opportunity: Opportunity, app: PackageDraft, options: WritePackageOptions) {
  const baseDir = options.runMode === "real"
    ? generatedApplicationsDir
    : path.join(projectRoot, "generated", `${options.runMode}-runs`, "applications");
  fs.mkdirSync(baseDir, { recursive: true });
  const folder = path.join(baseDir, `${opportunity.id}-${slugify(opportunity.title)}`);
  const internalDir = path.join(folder, "internal-notes");
  const reviewDir = path.join(folder, "user-review");
  const externalDir = path.join(folder, "external-submission");
  fs.mkdirSync(internalDir, { recursive: true });
  fs.mkdirSync(reviewDir, { recursive: true });
  fs.mkdirSync(externalDir, { recursive: true });

  const sanitized = sanitizeExternalMap({
    "application-answers-en.md": app.externalApplicationAnswersEn || app.draftEn,
    "application-answers-zh.md": app.externalApplicationAnswersZh || "",
    "bio-en.md": app.bioEn || "",
    "bio-zh.md": app.bioZh || "",
    "statement-en.md": app.statementEn || "",
    "statement-zh.md": app.statementZh || "",
    "cv.md": app.cvText || "",
    "email-en.md": app.emailDraftEn || "",
    "email-zh.md": app.emailDraftZh || "",
    "portfolio-text.md": app.portfolioText || app.selectedWorks
  });
  const sourceAudit = app.portfolioSourceAudit || buildPortfolioSourceAudit(opportunity, options, app);
  fs.writeFileSync(path.join(internalDir, "portfolio-source-audit.json"), JSON.stringify(sourceAudit, null, 2), "utf8");
  const portfolioPlan = app.portfolioPlan || buildFallbackPortfolioPlan(opportunity, app, options, sourceAudit);
  fs.writeFileSync(path.join(internalDir, "portfolio-plan.json"), JSON.stringify(portfolioPlan, null, 2), "utf8");
  const imageCopyResult = copyPortfolioPlanImages(externalDir, portfolioPlan);
  const renderedPortfolio = renderPortfolioPackage({
    externalDir,
    internalDir,
    opportunity,
    plan: portfolioPlan,
    copiedImages: imageCopyResult.copiedImages,
    webResearchReferences: app.portfolioWebResearchReferences || [],
    preflightIssues: imageCopyResult.issues
  });

  const userReviewZh = app.userReviewZh || renderDefaultUserReview(opportunity, app, sanitized.texts);
  const quality = runApplicationQualityChecks({
    userReviewZh,
    chineseReviewSummary: app.chineseReviewSummary || userReviewZh,
    externalTexts: sanitized.texts,
    englishExternalTexts: Object.fromEntries(Object.entries(sanitized.texts).filter(([name]) => name.endsWith("-en.md"))),
    selectedWorks: app.selectedWorks,
    portfolioText: sanitized.texts["portfolio-text.md"] || "",
    portfolioPlan,
    portfolioSourceAudit: sourceAudit,
    portfolioWebResearchReferences: app.portfolioWebResearchReferences || [],
    materialSources: options.materialSources,
    runMode: options.runMode
  });

  const internalIssues = [...sanitized.internalIssues, ...quality.internalIssues, ...imageCopyResult.issues];
  if (!renderedPortfolio.visualReport.passed) {
    internalIssues.push(...renderedPortfolio.visualReport.issues.map((issue) => `Portfolio visual/structure check: ${issue}`));
  }
  const manifestStatus = quality.passed && renderedPortfolio.visualReport.passed ? "package_ready_for_final_review" : "quality_blocked";

  fs.writeFileSync(path.join(internalDir, "open-call-analysis.md"), renderOpportunityInternalNotes(opportunity, app), "utf8");
  fs.writeFileSync(path.join(internalDir, "quality-report.json"), JSON.stringify(quality, null, 2), "utf8");
  fs.writeFileSync(path.join(internalDir, "internal-issues.md"), internalIssues.length ? internalIssues.map((item) => `- ${item}`).join("\n") : "- No internal issues recorded.", "utf8");
  fs.writeFileSync(path.join(internalDir, "portfolio-research.md"), renderPortfolioResearch(app.portfolioWebResearchReferences || [], quality.portfolioSourcesReferenced), "utf8");

  fs.writeFileSync(path.join(reviewDir, "机会与风险-中文审核.md"), userReviewZh, "utf8");
  if (app.chineseReviewSummary || app.draftZh) {
    fs.writeFileSync(path.join(reviewDir, "英文正式材料中文说明.md"), app.chineseReviewSummary || app.draftZh, "utf8");
  }

  for (const [fileName, text] of Object.entries(sanitized.texts)) {
    if (text.trim()) fs.writeFileSync(path.join(externalDir, fileName), text.trim() + "\n", "utf8");
  }
  fs.writeFileSync(path.join(externalDir, "file-checklist.md"), renderExternalFileChecklist(sanitized.texts), "utf8");

  fs.writeFileSync(path.join(folder, "opportunity.json"), JSON.stringify(opportunity, null, 2), "utf8");
  const fileQuality = checkExternalSubmissionFiles(externalDir);
  fs.writeFileSync(path.join(internalDir, "file-quality-check.json"), JSON.stringify(fileQuality, null, 2), "utf8");
  if (!fileQuality.passed) {
    internalIssues.push(...fileQuality.issues.map((issue) => `External file check: ${issue}`));
    fs.writeFileSync(path.join(internalDir, "internal-issues.md"), internalIssues.map((item) => `- ${item}`).join("\n"), "utf8");
  }
  fs.writeFileSync(path.join(reviewDir, "最终提交前检查清单-中文.md"), renderChineseChecklist(opportunity, app, quality.passed && fileQuality.passed, internalIssues), "utf8");
  writeGeneratedDocuments(reviewDir, {
    title: "最终提交包中文审核",
    subtitle: [opportunity.title, opportunity.organization, opportunity.deadline].filter(Boolean).join(" | "),
    sections: [
      { heading: "机会与风险", body: userReviewZh },
      { heading: "提交前检查", body: renderChineseChecklist(opportunity, app, quality.passed, internalIssues) },
      { heading: "英文正式材料中文说明", body: app.chineseReviewSummary || app.draftZh || "" }
    ].filter((section) => section.body.trim().length > 0)
  });

  const finalStatus = manifestStatus === "package_ready_for_final_review" && fileQuality.passed ? manifestStatus : "quality_blocked";
  const manifest = {
    manifestVersion: 2,
    generatedAt: new Date().toISOString(),
    status: finalStatus,
    runMode: options.runMode,
    boundaryModel: "internal_notes/user_review/external_submission",
    userReviewNodes: ["choose_opportunities", "approve_final_submission_package"],
    requiresUserFinalApproval: true,
    testRunIsolation: options.runMode === "real" ? "real application state" : `${options.runMode} output; not written to real application records`,
    opportunity: {
      id: opportunity.id,
      title: opportunity.title,
      organization: opportunity.organization,
      url: opportunity.url,
      deadline: opportunity.deadline,
      location: opportunity.location,
      status: opportunity.status
    },
    directories: {
      internalNotes: "internal-notes",
      userReview: "user-review",
      externalSubmission: "external-submission"
    },
    quality,
    portfolio: {
      html: path.relative(folder, renderedPortfolio.htmlPath),
      pdf: renderedPortfolio.pdfPath ? path.relative(folder, renderedPortfolio.pdfPath) : null,
      visualReport: renderedPortfolio.visualReport
    },
    fileQuality
  };
  fs.writeFileSync(path.join(folder, "package-manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  return { folder, status: finalStatus, quality };
}

function sanitizeExternalMap(files: Record<string, string>) {
  const texts: Record<string, string> = {};
  const internalIssues: string[] = [];
  for (const [fileName, text] of Object.entries(files)) {
    const sanitized = sanitizeExternalText(text || "");
    texts[fileName] = sanitized.text;
    internalIssues.push(...sanitized.internalIssues.map((issue) => `${fileName}: ${issue}`));
    if (sanitized.remainingBannedTerms.length > 0) {
      internalIssues.push(`${fileName}: Remaining forbidden terms: ${sanitized.remainingBannedTerms.join(", ")}`);
    }
  }
  return { texts, internalIssues };
}

function renderDefaultUserReview(opportunity: Opportunity, app: PackageDraft, externalTexts: Record<string, string>) {
  return [
    `# ${opportunity.title || "机会"} 中文审核摘要`,
    "",
    `机构：${opportunity.organization || "需核验"}`,
    `截止日期：${opportunity.deadline || "需核验"}`,
    `地点：${opportunity.location || "需核验"}`,
    `费用/资助：${[opportunity.fee, opportunity.funding].filter(Boolean).join("；") || "需核验"}`,
    "",
    "## 推荐理由与风险",
    opportunity.summary || "自动化已整理机会信息，最终提交前仍需核对官方页面。",
    opportunity.risks ? `风险：${opportunity.risks}` : "",
    "",
    "## AI 已完成的材料准备",
    "- 提取机会要求、资格、费用、截止日期和材料清单。",
    "- 初选作品并准备 CV、bio、statement、表格答案、邮件正文和作品集文字。",
    "- 检查对外材料是否含内部词、占位词、AI 腔高频词和格式风险。",
    "",
    "## 作品选择说明",
    app.selectedWorks || "作品选择记录见 internal-notes；对外材料不暴露筛选过程。",
    "",
    "## 正式材料中文说明",
    Object.entries(externalTexts)
      .filter(([, text]) => text.trim().length > 0)
      .map(([name]) => `- ${name} 已生成，并放在 external-submission。`)
      .join("\n")
  ].filter(Boolean).join("\n");
}

function renderOpportunityInternalNotes(opportunity: Opportunity, app: PackageDraft) {
  return [
    "# Internal Notes",
    "",
    "This file may include matching logic, risks, missing information, and AI decision process. Do not send it externally.",
    "",
    "## Opportunity",
    JSON.stringify({
      title: opportunity.title,
      organization: opportunity.organization,
      url: opportunity.url,
      deadline: opportunity.deadline,
      fee: opportunity.fee,
      funding: opportunity.funding,
      eligibility: opportunity.eligibility,
      materials: opportunity.materials,
      risks: opportunity.risks
    }, null, 2),
    "",
    "## Package Notes",
    app.internalNotes || "",
    "",
    "## Checklist",
    app.checklist || ""
  ].join("\n");
}

function renderPortfolioResearch(references: string[], existingPortfolioSources: string[]) {
  return [
    "# Portfolio Preparation Research",
    "",
    "## Existing User Portfolio Sources",
    existingPortfolioSources.length ? existingPortfolioSources.map((item) => `- ${item}`).join("\n") : "- Missing existing user portfolio source.",
    "",
    "## Web/Design References Recorded",
    references.length ? references.map((item) => `- ${item}`).join("\n") : "- Missing portfolio design research references.",
    "",
    "Use references only for structure, rhythm, image/text ratio, caption conventions, whitespace, and application PDF norms. Do not copy a specific design."
  ].join("\n");
}

function renderChineseChecklist(opportunity: Opportunity, app: PackageDraft, passed: boolean, internalIssues: string[]) {
  return [
    "# 最终提交前检查清单",
    "",
    `机会：${opportunity.title}`,
    `质量检查：${passed ? "已通过，可进入用户最终确认" : "未通过，需先处理 internal-notes/internal-issues.md"}`,
    "",
    "## 用户只需审核",
    "1. 是否申请这个机会。",
    "2. 最终提交包是否可以提交。",
    "",
    "## 自动化已检查",
    "- 对外文件不包含内部流程词、AI 痕迹、占位词或负面缺失词。",
    "- 用户审核材料为中文主导。",
    "- 英文正式材料配有中文审核说明。",
    "- 作品集生成记录了已有作品集参考和外部结构调研。",
    "- test/mock run 不进入真实待提交或已提交状态。",
    "",
    "## 内部问题",
    internalIssues.length ? internalIssues.map((item) => `- ${item}`).join("\n") : "- 暂无。"
  ].join("\n");
}

function renderExternalFileChecklist(externalTexts: Record<string, string>) {
  return [
    "# File Checklist",
    "",
    ...Object.entries(externalTexts)
      .filter(([, text]) => text.trim().length > 0)
      .map(([name]) => `- ${name}`)
  ].join("\n");
}

function buildPortfolioSourceAudit(
  opportunity: Opportunity,
  options: WritePackageOptions,
  app: PackageDraft
): PortfolioSourceAudit {
  const existingPortfolioSources = options.materialSources
    .filter((source) => source.kind === "portfolio")
    .map((source) => source.filePath || source.fileName || source.title)
    .filter(Boolean);
  const availableWorks = (options.works || []).map((work) => ({
    id: work.id,
    title: work.titleEn || work.title || work.titleZh || `Work ${work.id}`,
    year: work.year,
    medium: work.mediumEn || work.medium || work.mediumZh,
    dimensions: work.dimensionsEn || work.dimensions || work.dimensionsZh,
    imagePath: work.imagePath
  }));
  const availableImageFiles = listImageFiles([worksDir, sourceMaterialsDir, materialsInboxDir]);
  const missingMetadata = [
    ...availableWorks.flatMap((work) => {
      const missing = [];
      if (!work.year) missing.push(`${work.title}: missing year`);
      if (!work.medium) missing.push(`${work.title}: missing medium`);
      if (!work.dimensions) missing.push(`${work.title}: missing dimensions`);
      if (!work.imagePath) missing.push(`${work.title}: missing image path`);
      return missing;
    }),
    ...(app.missingMetadata || [])
  ];
  const rawMaterialsText = opportunity.materials || opportunity.rawContent || "";
  return {
    existingPortfolioSources,
    availableWorks,
    availableImageFiles,
    missingMetadata,
    lowConfidenceFacts: app.portfolioQualityRisks || [],
    opportunitySpecificConstraints: {
      maxPages: inferMaxPages(rawMaterialsText),
      targetFileSizeMb: inferTargetFileSizeMb(rawMaterialsText),
      language: /chinese|中文/i.test(rawMaterialsText) ? "zh" : "en",
      requiresCv: /\bcv\b|curriculum vitae/i.test(rawMaterialsText),
      requiresBio: /\bbio\b|biography/i.test(rawMaterialsText),
      requiresStatement: /statement/i.test(rawMaterialsText),
      requiresSinglePdf: /single pdf|one pdf|combined pdf/i.test(rawMaterialsText),
      rawMaterialsText
    },
    materialsActuallyUsed: existingPortfolioSources
  };
}

function buildFallbackPortfolioPlan(
  opportunity: Opportunity,
  app: PackageDraft,
  options: WritePackageOptions,
  audit: PortfolioSourceAudit
): PortfolioPlan {
  const artistName = options.profile?.nameEn || options.profile?.name || options.profile?.nameZh || "Artist";
  const selectedImagePaths = extractLegacyImagePaths(app.selectedWorks);
  const selectedWorks: Array<{ title: string; imagePath: string; year?: string; medium?: string; dimensions?: string }> = selectedImagePaths.length
    ? selectedImagePaths.map((imagePath, index) => ({ title: legacyTitleForImage(app.selectedWorks, imagePath) || `Work ${index + 1}`, imagePath }))
    : audit.availableWorks.filter((work) => work.imagePath).slice(0, 8).map((work) => ({ title: work.title, imagePath: work.imagePath || "", year: work.year, medium: work.medium, dimensions: work.dimensions }));
  const pages: PortfolioPlanPage[] = [
    {
      type: "cover",
      title: artistName,
      subtitle: "Selected Works",
      year: String(new Date().getFullYear()),
      contact: [options.profile?.email, options.profile?.website].filter(Boolean).join(" | ") || undefined
    },
    ...selectedWorks.map((work) => ({
      type: "work_full_page" as const,
      title: work.title,
      year: work.year,
      medium: work.medium,
      dimensions: work.dimensions,
      imageRole: "primary" as const,
      imagePath: work.imagePath,
      caption: [work.title, work.year, work.medium, work.dimensions].filter(Boolean).join(", ")
    }))
  ];
  return {
    artistName,
    portfolioTitle: "Selected Works",
    year: String(new Date().getFullYear()),
    language: audit.opportunitySpecificConstraints.language || "en",
    maxPages: audit.opportunitySpecificConstraints.maxPages,
    targetFileSizeMb: audit.opportunitySpecificConstraints.targetFileSizeMb,
    pages,
    excludedImages: app.excludedWorksOrImages?.map((item) => ({ path: item.path || String(item.id || ""), reason: item.reason })) || [],
    qualityRisks: [
      "Fallback PortfolioPlan was built from legacy selectedWorks or stored works because AI did not provide structured portfolioPlan.",
      ...(app.portfolioQualityRisks || [])
    ]
  };
}

function copyPortfolioPlanImages(externalDir: string, plan: PortfolioPlan) {
  const imageDir = path.join(externalDir, "images");
  const paths = [...new Set(extractPortfolioPlanImagePaths(plan))];
  const copiedImages: Array<{
    sourcePath: string;
    targetFileName: string;
    width: number;
    height: number;
    format: string;
    sizeBytes: number;
    optimized: boolean;
    tooSmallForFullPage: boolean;
  }> = [];
  const issues: string[] = [];

  for (const imagePath of paths) {
    const safeImagePath = resolveAllowedImagePath(imagePath);
    if (!safeImagePath) {
      issues.push(`Portfolio image is missing or outside allowed directories: ${imagePath}`);
      continue;
    }
    const metadata = readImageMetadata(safeImagePath);
    if (!metadata.ok) {
      issues.push(`Portfolio image cannot be read by sharp: ${imagePath} (${metadata.error})`);
      continue;
    }
    fs.mkdirSync(imageDir, { recursive: true });
    const targetPath = path.join(imageDir, path.basename(safeImagePath));
    try {
      fs.copyFileSync(safeImagePath, targetPath);
      const optimized = optimizeCopiedImage(targetPath);
      const finalMetadata = readImageMetadata(targetPath);
      if (!finalMetadata.ok) {
        issues.push(`Copied portfolio image cannot be read after copy: ${imagePath} (${finalMetadata.error})`);
        continue;
      }
      copiedImages.push({
        sourcePath: imagePath,
        targetFileName: path.basename(targetPath),
        width: finalMetadata.width,
        height: finalMetadata.height,
        format: finalMetadata.format,
        sizeBytes: fs.statSync(targetPath).size,
        optimized,
        tooSmallForFullPage: Math.max(finalMetadata.width, finalMetadata.height) < 1600 || Math.min(finalMetadata.width, finalMetadata.height) < 900
      });
    } catch (error) {
      issues.push(`Failed to copy portfolio image ${imagePath}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }
  if (paths.length === 0) issues.push("PortfolioPlan references no formal image paths.");
  return { copiedImages, issues };
}

function optimizeCopiedImage(imagePath: string) {
  const extension = path.extname(imagePath).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp"].includes(extension)) return false;

  try {
    const before = fs.statSync(imagePath).size;
    const code = `
      const fs = require("node:fs");
      const sharp = require("sharp");
      const imagePath = ${JSON.stringify(imagePath)};
      const tmpPath = imagePath + ".optimized";
      (async () => {
        const pipeline = sharp(imagePath).rotate().resize({
          width: 2400,
          height: 2400,
          fit: "inside",
          withoutEnlargement: true
        });
        if (/\\.png$/i.test(imagePath)) {
          await pipeline.png({ compressionLevel: 9, palette: true }).toFile(tmpPath);
        } else if (/\\.webp$/i.test(imagePath)) {
          await pipeline.webp({ quality: 84 }).toFile(tmpPath);
        } else {
          await pipeline.jpeg({ quality: 84, mozjpeg: true }).toFile(tmpPath);
        }
        if (fs.statSync(tmpPath).size < fs.statSync(imagePath).size) {
          fs.renameSync(tmpPath, imagePath);
        } else {
          fs.unlinkSync(tmpPath);
        }
      })().catch((error) => { console.error(error); process.exit(1); });
    `;
    childProcess.execFileSync(process.execPath, ["-e", code], {
      cwd: process.cwd(),
      stdio: "ignore",
      timeout: 30000
    });
    return fs.statSync(imagePath).size < before;
  } catch {
    return false;
  }
}

function readImageMetadata(imagePath: string) {
  try {
    const code = `
      const sharp = require("sharp");
      sharp(${JSON.stringify(imagePath)}).metadata()
        .then((metadata) => console.log(JSON.stringify({
          width: metadata.width || 0,
          height: metadata.height || 0,
          format: metadata.format || ""
        })))
        .catch((error) => { console.error(error.message); process.exit(1); });
    `;
    const output = childProcess.execFileSync(process.execPath, ["-e", code], {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 30000
    });
    const metadata = JSON.parse(output) as { width: number; height: number; format: string };
    return metadata.width && metadata.height
      ? { ok: true as const, ...metadata }
      : { ok: false as const, error: "missing width/height" };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "unknown error" };
  }
}

function extractPortfolioPlanImagePaths(plan: PortfolioPlan) {
  return plan.pages.flatMap((page) => {
    if (page.type === "work_full_page") return [page.imagePath].filter(Boolean);
    if (page.type === "work_with_details" || page.type === "installation_spread" || page.type === "series_grid") {
      return page.images.map((image) => image.path).filter(Boolean);
    }
    return [];
  });
}

function extractLegacyImagePaths(selectedWorks: string) {
  return selectedWorks
    .split("\n")
    .map((line) => line.match(/Image:\s*(.+)$/i)?.[1]?.trim())
    .filter((value): value is string => Boolean(value));
}

function legacyTitleForImage(selectedWorks: string, imagePath: string) {
  const line = selectedWorks.split("\n").find((item) => item.includes(imagePath)) || "";
  return line.replace(/Image:\s*.+$/i, "").replace(/^[-*]\s*/, "").replace(/[.,，。]\s*$/, "").trim();
}

function listImageFiles(roots: string[]) {
  const files: string[] = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const item of fs.readdirSync(root, { recursive: true, withFileTypes: true })) {
      if (!item.isFile()) continue;
      const filePath = path.join(item.parentPath, item.name);
      if (/\.(jpe?g|png|webp|tiff?)$/i.test(filePath)) files.push(filePath);
    }
  }
  return files;
}

function inferMaxPages(text: string) {
  const match = text.match(/(?:max(?:imum)?|up to|no more than)\s+(\d{1,2})\s+pages?/i);
  return match ? Number(match[1]) : undefined;
}

function inferTargetFileSizeMb(text: string) {
  const match = text.match(/(\d{1,3})\s*(?:mb|megabytes?)/i);
  return match ? Number(match[1]) : undefined;
}

function resolveAllowedImagePath(imagePath: string) {
  if (!fs.existsSync(imagePath)) return null;
  const realImagePath = fs.realpathSync(imagePath);
  const allowedRoots = [worksDir, sourceMaterialsDir, materialsInboxDir].map((dir) => fs.realpathSync(dir));
  return allowedRoots.some((root) => realImagePath === root || realImagePath.startsWith(`${root}${path.sep}`))
    ? realImagePath
    : null;
}
