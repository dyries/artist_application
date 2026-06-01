import fs from "node:fs";
import path from "node:path";
import childProcess from "node:child_process";
import { generatedApplicationsDir, projectRoot, materialsInboxDir, sourceMaterialsDir, worksDir } from "./paths";
import { writeGeneratedDocuments } from "./documentOutputs";
import { runApplicationQualityChecks } from "./qualityChecks";
import { sanitizeExternalText } from "./outputSanitizer";
import { renderPortfolioPackage } from "./portfolioRenderer";
import { checkExternalSubmissionFiles } from "./fileQualityCheck";
import type { Application, AutomationRunMode, Opportunity, SourceMaterial } from "@/types/domain";

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
};

type WritePackageOptions = {
  runMode: AutomationRunMode;
  materialSources: Pick<SourceMaterial, "kind" | "title" | "fileName" | "filePath" | "content" | "analysis">[];
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
  const existingPortfolioSources = options.materialSources
    .filter((source) => source.kind === "portfolio")
    .map((source) => source.fileName || source.title || source.filePath)
    .filter(Boolean);
  copySelectedImages(externalDir, app.selectedWorks);
  const renderedPortfolio = renderPortfolioPackage({
    externalDir,
    internalDir,
    opportunity,
    selectedWorks: app.selectedWorks,
    portfolioText: sanitized.texts["portfolio-text.md"] || "",
    existingPortfolioSources,
    webResearchReferences: app.portfolioWebResearchReferences || [],
    materialSources: options.materialSources
  });

  const userReviewZh = app.userReviewZh || renderDefaultUserReview(opportunity, app, sanitized.texts);
  const quality = runApplicationQualityChecks({
    userReviewZh,
    chineseReviewSummary: app.chineseReviewSummary || userReviewZh,
    externalTexts: sanitized.texts,
    englishExternalTexts: Object.fromEntries(Object.entries(sanitized.texts).filter(([name]) => name.endsWith("-en.md"))),
    selectedWorks: app.selectedWorks,
    portfolioText: sanitized.texts["portfolio-text.md"] || "",
    portfolioWebResearchReferences: app.portfolioWebResearchReferences || [],
    materialSources: options.materialSources,
    runMode: options.runMode
  });

  const internalIssues = [...sanitized.internalIssues, ...quality.internalIssues];
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

function copySelectedImages(externalDir: string, selectedWorks: string) {
  const imageDir = path.join(externalDir, "images");
  const paths = selectedWorks
    .split("\n")
    .map((line) => line.match(/Image:\s*(.+)$/i)?.[1]?.trim())
    .filter((value): value is string => Boolean(value));

  for (const imagePath of paths) {
    const safeImagePath = resolveAllowedImagePath(imagePath);
    if (!safeImagePath) continue;
    fs.mkdirSync(imageDir, { recursive: true });
    const targetPath = path.join(imageDir, path.basename(safeImagePath));
    fs.copyFileSync(safeImagePath, targetPath);
    optimizeCopiedImage(targetPath);
  }
}

function optimizeCopiedImage(imagePath: string) {
  const extension = path.extname(imagePath).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp"].includes(extension)) return;

  try {
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
  } catch {
    // Keep the original file if local image optimization tooling is unavailable.
  }
}

function resolveAllowedImagePath(imagePath: string) {
  if (!fs.existsSync(imagePath)) return null;
  const realImagePath = fs.realpathSync(imagePath);
  const allowedRoots = [worksDir, sourceMaterialsDir, materialsInboxDir].map((dir) => fs.realpathSync(dir));
  return allowedRoots.some((root) => realImagePath === root || realImagePath.startsWith(`${root}${path.sep}`))
    ? realImagePath
    : null;
}
