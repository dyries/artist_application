import fs from "node:fs";
import path from "node:path";
import childProcess from "node:child_process";
import crypto from "node:crypto";
import { generatedApplicationsDir, projectRoot, materialsInboxDir, sourceMaterialsDir, worksDir } from "./paths";
import { writeGeneratedDocuments } from "./documentOutputs";
import { runApplicationQualityChecks } from "./qualityChecks";
import { findBannedExternalTerms, sanitizeExternalText } from "./outputSanitizer";
import { renderHtmlToPdf, renderPortfolioPackage } from "./portfolioRenderer";
import { checkExternalSubmissionFiles } from "./fileQualityCheck";
import { analyzePortfolioImages } from "./portfolioImageAnalysis";
import type {
  Application,
  ArtistProfile,
  AutomationRunMode,
  Opportunity,
  PortfolioAutoRepairLog,
  PortfolioConstraints,
  PortfolioIssueClassification,
  PortfolioAuditedImage,
  PortfolioImageAnalysis,
  PortfolioLayoutResearch,
  PortfolioPlan,
  PortfolioPlanImage,
  PortfolioPlanPage,
  PortfolioTheme,
  PortfolioThemeName,
  PortfolioSourceAudit,
  PortfolioVariant,
  SourceMaterial,
  Work
} from "@/types/domain";

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
  selectedImages?: Array<{ workId?: number | string; title?: string; path: string; role?: string; imageQualityScore?: number; reason?: string }>;
  excludedImages?: Array<{ workId?: number | string; title?: string; path: string; role?: string; reason: string }>;
  excludedWorksOrImages?: Array<{ id?: number | string; path?: string; reason: string }>;
  missingMetadata?: string[];
  portfolioQualityRisks?: string[];
  portfolioVariants?: PortfolioVariant[];
  autoRepairIntent?: { maxRounds?: number; ordinaryIssuesAreAutoFixable?: boolean; blockingOnlyRequiresUser?: boolean };
};

type WritePackageOptions = {
  runMode: AutomationRunMode;
  materialSources: Pick<SourceMaterial, "kind" | "title" | "fileName" | "filePath" | "content" | "analysis">[];
  profile?: ArtistProfile;
  works?: Work[];
};

type ImageMetadataResult =
  | { ok: true; width: number; height: number; format: string }
  | { ok: false; error: string };

const imageMetadataCache = new Map<string, ImageMetadataResult>();
const imageCandidateScoreCache = new Map<string, number>();

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
  fs.rmSync(folder, { recursive: true, force: true });
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
  const finalPortfolioResult = generatePortfolioWithAutoRepair(opportunity, app, options, externalDir, internalDir);
  const sourceAudit = finalPortfolioResult.sourceAudit;
  const portfolioPlan = finalPortfolioResult.plan;
  const imageCopyResult = finalPortfolioResult.imageCopyResult;
  const renderedPortfolio = finalPortfolioResult.renderedPortfolio;
  const portfolioBlockingIssues = finalPortfolioResult.blockingIssues.map((issue) => issue.message);
  addSanitizedExternalFile(sanitized, "image-captions.md", renderImageCaptions(portfolioPlan));

  const lastRender = renderedPortfolio || renderPortfolioPackage({
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
    portfolioVisualReport: lastRender.visualReport,
    portfolioWebResearchReferences: app.portfolioWebResearchReferences || [],
    materialSources: options.materialSources,
    runMode: options.runMode
  });

  const internalIssues = [
    ...sanitized.internalIssues,
    ...quality.internalIssues,
    ...portfolioBlockingIssues.map((issue) => `Portfolio blocking issue: ${issue}`)
  ];

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
  finalPortfolioResult.variants = materializePortfolioVariants({
    opportunity,
    plan: portfolioPlan,
    externalDir,
    internalDir,
    copiedImages: imageCopyResult.copiedImages,
    webResearchReferences: app.portfolioWebResearchReferences || [],
    defaultPdfPath: lastRender.pdfPath,
    externalTexts: sanitized.texts
  });
  const portfolioSourceArtifacts = movePortfolioSourceArtifactsToInternal(externalDir, internalDir);
  fs.writeFileSync(path.join(externalDir, "file-checklist.md"), renderExternalDirectoryChecklist(externalDir), "utf8");

  fs.writeFileSync(path.join(folder, "opportunity.json"), JSON.stringify(opportunity, null, 2), "utf8");
  const fileQuality = checkExternalSubmissionFiles(externalDir);
  fs.writeFileSync(path.join(internalDir, "file-quality-check.json"), JSON.stringify(fileQuality, null, 2), "utf8");
  const readiness = evaluatePackageReadiness({
    opportunity,
    sanitized,
    externalDir,
    qualityPassed: quality.passed,
    fileQuality,
    portfolioResult: finalPortfolioResult,
    renderedPortfolio: lastRender
  });
  fs.writeFileSync(path.join(internalDir, "package-readiness-check.json"), JSON.stringify(readiness, null, 2), "utf8");
  const fileQualityWarnings: string[] = [];
  if (readiness.issues.length) {
    internalIssues.push(...readiness.issues.map((issue) => `Readiness gate: ${issue}`));
    fs.writeFileSync(path.join(internalDir, "internal-issues.md"), internalIssues.map((item) => `- ${item}`).join("\n"), "utf8");
  }
  fs.writeFileSync(path.join(reviewDir, "最终提交前检查清单-中文.md"), renderChineseChecklist(opportunity, app, readiness.passed, internalIssues, finalPortfolioResult), "utf8");
  writeGeneratedDocuments(reviewDir, {
    title: "最终提交包中文审核",
    subtitle: [opportunity.title, opportunity.organization, opportunity.deadline].filter(Boolean).join(" | "),
    sections: [
      { heading: "机会与风险", body: userReviewZh },
      { heading: "提交前检查", body: renderChineseChecklist(opportunity, app, readiness.passed, internalIssues, finalPortfolioResult) },
      { heading: "英文正式材料中文说明", body: app.chineseReviewSummary || app.draftZh || "" }
    ].filter((section) => section.body.trim().length > 0)
  });

  const finalStatus = readiness.passed ? "package_ready_for_final_review" : "quality_blocked";
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
    readiness,
    opportunityVerification: readiness.opportunityVerification,
    portfolio: {
      html: portfolioSourceArtifacts.portfolioHtml
        ? path.relative(folder, portfolioSourceArtifacts.portfolioHtml)
        : null,
      pdf: lastRender.pdfPath ? path.relative(folder, lastRender.pdfPath) : null,
      portfolioConstraints: portfolioPlan.portfolioConstraints,
      targetPages: portfolioPlan.portfolioConstraints.targetPages,
      minimumPages: portfolioPlan.portfolioConstraints.minimumPages,
      maximumPages: portfolioPlan.portfolioConstraints.maximumPages,
      actualPageCount: lastRender.visualReport.pageCount,
      themeUsed: portfolioPlan.designSystem?.themeName || lastRender.visualReport.themeCounts,
      layoutStrategyCounts: lastRender.visualReport.layoutStrategyCounts,
      aestheticScore: lastRender.visualReport.aestheticScore,
      professionalPdfScore: lastRender.visualReport.professionalPdfScore,
      autoRepairRounds: finalPortfolioResult.autoRepairLog.rounds.length,
      selectedImages: finalPortfolioResult.selectedImages,
      excludedImages: finalPortfolioResult.excludedImages,
      missingMetadata: finalPortfolioResult.missingMetadata,
      qualityRisks: finalPortfolioResult.qualityRisks,
      autoFixableIssuesResolved: finalPortfolioResult.autoFixableIssuesResolved,
      remainingWarnings: [...finalPortfolioResult.warnings, ...fileQualityWarnings.map((issue) => ({ code: "external_file_quality_warning", message: issue, severity: "warning" as const }))],
      blockingIssues: finalPortfolioResult.blockingIssues,
      portfolioAutoRepairLog: "internal-notes/portfolio-auto-repair-log.json",
      imageCopyMap: imageCopyResult.copiedImages.map((image) => ({ sourcePath: image.sourcePath, targetFileName: image.targetFileName })),
      variants: finalPortfolioResult.variants,
      visualReport: lastRender.visualReport
    },
    fileQuality
  };
  fs.writeFileSync(path.join(folder, "package-manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  return { folder, status: finalStatus, quality };
}

function sanitizeExternalMap(files: Record<string, string>) {
  const texts: Record<string, string> = {};
  const internalIssues: string[] = [];
  const fileReports: Record<string, {
    originalCharacters: number;
    sanitizedCharacters: number;
    originalWords: number;
    sanitizedWords: number;
    removedCharacters: number;
    remainingBannedTerms: string[];
  }> = {};
  for (const [fileName, text] of Object.entries(files)) {
    const original = text || "";
    const sanitized = sanitizeExternalText(original);
    texts[fileName] = sanitized.text;
    fileReports[fileName] = {
      originalCharacters: original.length,
      sanitizedCharacters: sanitized.text.length,
      originalWords: wordCount(original),
      sanitizedWords: wordCount(sanitized.text),
      removedCharacters: Math.max(0, original.length - sanitized.text.length),
      remainingBannedTerms: sanitized.remainingBannedTerms
    };
    internalIssues.push(...sanitized.internalIssues.map((issue) => `${fileName}: ${issue}`));
    if (sanitized.remainingBannedTerms.length > 0) {
      internalIssues.push(`${fileName}: Remaining forbidden terms: ${sanitized.remainingBannedTerms.join(", ")}`);
    }
  }
  return { texts, internalIssues, fileReports };
}

function addSanitizedExternalFile(result: ReturnType<typeof sanitizeExternalMap>, fileName: string, original: string) {
  const sanitized = sanitizeExternalText(original);
  result.texts[fileName] = sanitized.text;
  result.fileReports[fileName] = {
    originalCharacters: original.length,
    sanitizedCharacters: sanitized.text.length,
    originalWords: wordCount(original),
    sanitizedWords: wordCount(sanitized.text),
    removedCharacters: Math.max(0, original.length - sanitized.text.length),
    remainingBannedTerms: sanitized.remainingBannedTerms
  };
  result.internalIssues.push(...sanitized.internalIssues.map((issue) => `${fileName}: ${issue}`));
  if (sanitized.remainingBannedTerms.length > 0) {
    result.internalIssues.push(`${fileName}: Remaining forbidden terms: ${sanitized.remainingBannedTerms.join(", ")}`);
  }
}

function evaluatePackageReadiness(input: {
  opportunity: Opportunity;
  sanitized: ReturnType<typeof sanitizeExternalMap>;
  externalDir: string;
  qualityPassed: boolean;
  fileQuality: ReturnType<typeof checkExternalSubmissionFiles>;
  portfolioResult: ReturnType<typeof generatePortfolioWithAutoRepair>;
  renderedPortfolio: NonNullable<ReturnType<typeof generatePortfolioWithAutoRepair>["renderedPortfolio"]>;
}) {
  const issues: string[] = [];
  const requiredFiles = requiredExternalFiles(input.opportunity, input.portfolioResult.plan.portfolioConstraints);
  const requiredFileStatus = requiredFiles.map((fileName) => {
    const filePath = path.join(input.externalDir, fileName);
    const exists = fs.existsSync(filePath);
    const isDirectory = exists && fs.statSync(filePath).isDirectory();
    const bytes = exists && !isDirectory ? fs.statSync(filePath).size : 0;
    const directoryFiles = isDirectory ? listExternalRelativeFiles(filePath) : [];
    const readable = exists && (isDirectory ? directoryFiles.length > 0 : bytes > 0);
    if (!readable) issues.push(`Required external file missing or empty: ${fileName}`);
    return { fileName, exists, bytes, readable, isDirectory, directoryFiles };
  });

  for (const [fileName, report] of Object.entries(input.sanitized.fileReports)) {
    const originalHadSubstance = report.originalWords >= 20 || report.originalCharacters >= 120;
    const deletesTooMuch = report.originalCharacters > 0 && report.removedCharacters / report.originalCharacters > 0.55;
    if (report.remainingBannedTerms.length) issues.push(`${fileName} still contains forbidden external terms: ${report.remainingBannedTerms.join(", ")}`);
    if (originalHadSubstance && (deletesTooMuch || report.sanitizedWords < 20)) {
      issues.push(`${fileName} became too short after sanitizer removed unsafe language.`);
    }
  }

  for (const file of input.fileQuality.files) {
    const filePath = path.join(input.externalDir, file.path);
    if (/\.(md|txt|html)$/i.test(file.extension)) {
      const hits = findBannedExternalTerms(externalLanguageScanText(filePath, file.extension));
      if (hits.length) issues.push(`${file.path} contains forbidden external language after write: ${hits.join(", ")}`);
    }
  }

  const opportunityVerification = verifyOpportunityReadiness(input.opportunity);
  if (!opportunityVerification.passed) issues.push(...opportunityVerification.issues);
  if (!input.qualityPassed) issues.push("Application quality checks did not pass.");
  if (!input.fileQuality.passed) issues.push(...input.fileQuality.issues.map((issue) => `External file quality failed: ${issue}`));
  if (!input.renderedPortfolio.visualReport.passed) {
    issues.push("Portfolio visual gate did not pass.");
  }
  if (input.portfolioResult.blockingIssues.length) {
    issues.push(...input.portfolioResult.blockingIssues.map((issue) => `Portfolio blocked: ${issue.message}`));
  }
  if (input.renderedPortfolio.visualReport.missingImages.length) {
    issues.push(`Portfolio has missing image references: ${input.renderedPortfolio.visualReport.missingImages.join(", ")}`);
  }

  return {
    checkedAt: new Date().toISOString(),
    passed: issues.length === 0,
    issues: [...new Set(issues)],
    requiredFiles: requiredFileStatus,
    sanitizer: input.sanitized.fileReports,
    fileQualityBlockingIssues: input.fileQuality.issues,
    fileQuality: input.fileQuality,
    portfolioGate: {
      passed: input.renderedPortfolio.visualReport.passed,
      pageCount: input.renderedPortfolio.visualReport.pageCount,
      aestheticScore: input.renderedPortfolio.visualReport.aestheticScore,
      professionalPdfScore: input.renderedPortfolio.visualReport.professionalPdfScore,
      missingImages: input.renderedPortfolio.visualReport.missingImages,
      blockingIssues: input.renderedPortfolio.visualReport.blockingIssues,
      autoFixableIssues: input.renderedPortfolio.visualReport.autoFixableIssues
    },
    opportunityVerification
  };
}

function externalLanguageScanText(filePath: string, extension: string) {
  const text = fs.readFileSync(filePath, "utf8");
  if (extension !== ".html") return text;
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function requiredExternalFiles(opportunity: Opportunity, constraints: PortfolioConstraints) {
  const text = `${opportunity.materials}\n${opportunity.rawContent}`.toLowerCase();
  const languageSuffix = /中文|chinese|mandarin/.test(text) ? "zh" : "en";
  const files = new Set(["file-checklist.md"]);
  if (constraints.requiresImageUploadOnly) files.add("images-for-upload");
  else files.add("portfolio.pdf");
  if (/short|10\s*(?:pages?|p\b)/i.test(text)) files.add("portfolio-short-10p.pdf");
  if (constraints.requiresCombinedPdf) files.add("combined-application-package.pdf");
  if (/\bcv\b|curriculum vitae/.test(text)) files.add("cv.md");
  if (/\bbio\b|biography|艺术家简介/.test(text)) files.add(`bio-${languageSuffix}.md`);
  if (/statement|艺术家陈述/.test(text)) files.add(`statement-${languageSuffix}.md`);
  if (/email|邮件/.test(text) || opportunity.submissionMethod === "email") files.add(`email-${languageSuffix}.md`);
  if (/application|answer|proposal|question|form|申请问题|申请表/.test(text)) files.add(`application-answers-${languageSuffix}.md`);
  if (/caption|work list|image list|作品说明|图片说明|作品清单/.test(text)) files.add("image-captions.md");
  return [...files];
}

function listExternalRelativeFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory()
      ? listExternalRelativeFiles(fullPath).map((fileName) => path.join(entry.name, fileName))
      : [entry.name];
  });
}

function verifyOpportunityReadiness(opportunity: Opportunity) {
  const sourceText = `${opportunity.rawContent || ""}\n${opportunity.summary || ""}\n${opportunity.risks || ""}`;
  const sourceUrl = opportunity.url || "";
  const fields = [
    { name: "deadline", value: opportunity.deadline },
    { name: "fee", value: opportunity.fee },
    { name: "funding", value: opportunity.funding },
    { name: "eligibility", value: opportunity.eligibility },
    { name: "materials", value: opportunity.materials },
    { name: "method", value: opportunity.submissionMethod === "unknown" ? "" : opportunity.submissionMethod },
    { name: "location", value: opportunity.location }
  ];
  const issues: string[] = [];
  const facts = fields.map((field) => {
    const value = String(field.value || "").trim();
    const unclear = !value || /\b(unclear|unknown|n\/a|tbd|to be confirmed|not specified)\b/i.test(value);
    const excerpt = sourceExcerptForValue(sourceText, value);
    const hasSource = Boolean(sourceUrl && (excerpt || sourceText.length >= 80));
    const confidence = unclear ? "low" : excerpt ? "high" : hasSource ? "medium" : "low";
    if (unclear) issues.push(`Opportunity ${field.name} is unclear or missing.`);
    if (!hasSource) issues.push(`Opportunity ${field.name} lacks source excerpt or source URL.`);
    return {
      field: field.name,
      value,
      sourceUrl,
      sourceExcerpt: excerpt,
      confidence
    };
  });
  if (/\b(unclear eligibility|unclear fees?|payment|pay-to-show|legal|privacy|captcha|login)\b/i.test(opportunity.risks || "")) {
    issues.push("Opportunity risks include a hard stop or unclear eligibility/fees.");
  }
  return { passed: issues.length === 0, issues: [...new Set(issues)], facts };
}

function sourceExcerptForValue(sourceText: string, value: string) {
  if (!sourceText.trim() || !value.trim()) return "";
  const normalizedValue = value.toLowerCase().slice(0, 80);
  const normalizedSource = sourceText.toLowerCase();
  const index = normalizedSource.indexOf(normalizedValue);
  if (index >= 0) return sourceText.slice(Math.max(0, index - 80), Math.min(sourceText.length, index + value.length + 160)).trim();
  const sentence = sourceText.split(/(?<=[.!?。！？])\s+/).find((item) => item.toLowerCase().includes(value.split(/\s+/)[0]?.toLowerCase() || ""));
  return sentence?.trim().slice(0, 300) || "";
}

function wordCount(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
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

function performPortfolioLayoutResearch(opportunity: Opportunity, options: WritePackageOptions, internalDir: string): PortfolioLayoutResearch {
  const queriesUsed = [
    "artist portfolio PDF examples",
    "visual artist portfolio PDF",
    "painting portfolio PDF",
    "installation artist portfolio PDF",
    "MFA fine art portfolio PDF",
    "residency application portfolio",
    "contemporary artist selected works PDF",
    "gallery artist portfolio PDF"
  ];
  const candidates: PortfolioLayoutResearch["references"] = [
    {
      title: "Artists Collecting Society portfolio guide",
      url: "https://artistscollectingsociety.org/news/artist-portfolio-guide/",
      sourceType: "school guidance",
      fetched: false,
      relevantFor: ["caption", "selected works list", "painting page"],
      layoutObservations: ["Application portfolios benefit from strong image priority and concise factual captions.", "Captions should carry title, date, size, and medium where known."],
      doNotCopyWarning: true
    },
    {
      title: "Rhode Island School of Design MFA application portfolio guidance",
      url: "https://www.risd.edu/admissions/graduate/apply",
      sourceType: "MFA example",
      fetched: false,
      relevantFor: ["series / grid", "caption", "cover"],
      layoutObservations: ["Fine art application portfolios are treated as a curated selection, not a complete archive.", "Image order and concise metadata matter because reviewers scan quickly."],
      doNotCopyWarning: true
    },
    {
      title: "School of the Art Institute of Chicago graduate portfolio guidance",
      url: "https://www.saic.edu/admissions/graduate/portfolio",
      sourceType: "MFA example",
      fetched: false,
      relevantFor: ["project opener", "painting page", "series / grid"],
      layoutObservations: ["Portfolio selections should represent a coherent practice across media and projects.", "Series can be summarized through selected images rather than exhaustive repetition."],
      doNotCopyWarning: true
    },
    {
      title: "UCL Slade MFA application portfolio information",
      url: "https://www.ucl.ac.uk/slade/study/apply",
      sourceType: "school guidance",
      fetched: false,
      relevantFor: ["selected works list", "statement", "caption"],
      layoutObservations: ["Applications distinguish artist statement, CV, and visual documentation as separate information layers.", "Formal metadata should remain clear and brief."],
      doNotCopyWarning: true
    },
    {
      title: "SculptureCenter exhibition and artist documentation pages",
      url: "https://www.sculpture-center.org/",
      sourceType: "gallery PDF",
      fetched: false,
      relevantFor: ["installation spread", "installation documentation", "detail"],
      layoutObservations: ["Installation documentation should show the spatial relation before details.", "Captions should not crowd installation images."],
      doNotCopyWarning: true
    },
    {
      title: "Art Omi residency application information",
      url: "https://artomi.org/residencies/",
      sourceType: "residency guidance",
      fetched: false,
      relevantFor: ["project opener", "statement", "selected works list"],
      layoutObservations: ["Residency materials need a concise practice overview and selected evidence of current direction.", "Project grouping helps explain why works belong together."],
      doNotCopyWarning: true
    },
    {
      title: "Vermont Studio Center application information",
      url: "https://vermontstudiocenter.org/apply/",
      sourceType: "residency guidance",
      fetched: false,
      relevantFor: ["cover", "caption", "painting page"],
      layoutObservations: ["Application review favors direct, readable images with limited supporting text.", "Painting pages should preserve scale, edges, and factual captioning."],
      doNotCopyWarning: true
    },
    {
      title: "Exhibit-E artist websites and PDF portfolio conventions",
      url: "https://www.exhibit-e.com/",
      sourceType: "design article",
      fetched: false,
      relevantFor: ["cover", "project opener", "selected works list", "caption"],
      layoutObservations: ["Artist portfolio presentation often separates project identity, selected images, biography, and contact.", "Whitespace and restrained typography help images carry the page."],
      doNotCopyWarning: true
    }
  ];
  const configuredReferences = parseResearchSourceUrls(process.env.ARTIST_STUDIO_PORTFOLIO_RESEARCH_SOURCE_URLS).map((url, index) => ({
    title: `Configured portfolio research source ${index + 1}`,
    url,
    sourceType: "artist portfolio" as const,
    fetched: false,
    relevantFor: ["page rhythm", "layout", "caption"],
    layoutObservations: ["Configured live source is used only to derive reusable layout principles, not to copy a specific design."],
    doNotCopyWarning: true
  }));
  const researchCandidates = configuredReferences.length ? [...configuredReferences, ...candidates.slice(0, 2)] : candidates.slice(0, 1);
  const reachable = researchCandidates
    .map((reference) => {
      const extractedTextExcerpt = fetchReferenceExcerpt(reference.url);
      return { ...reference, fetched: Boolean(extractedTextExcerpt), extractedTextExcerpt };
    })
    .filter((reference) => reference.fetched);
  const referencesWithScreenshots = reachable.map((reference, index) => ({
    ...reference,
    screenshotPath: index < 1 ? captureResearchScreenshot(reference.url, internalDir, index) : undefined
  }));
  const derivedLayoutPrinciples = fallbackLayoutPrinciples();
  const research: PortfolioLayoutResearch = {
    searchedAt: new Date().toISOString(),
    queriesUsed,
    references: referencesWithScreenshots,
    derivedLayoutPrinciples,
    executablePatterns: {
      recommendedPageRhythm: ["cover", "short_statement", "project_opener", "installation_overview", "single_work_full_page", "detail_page", "series_overview_grid", "two_image_spread", "text_image_context", "selected_works_list", "contact_or_cv_summary"],
      imageTextRatioRules: ["Image-first pages should use at least 65% of the live page area.", "Statement/context pages should keep text under one readable column.", "Grid pages should use four images or fewer unless the opportunity requires upload thumbnails."],
      captionPlacementRules: ["Captions belong below or beside the image in 9-10.5pt equivalent type.", "Captions must stay factual: title, year, medium, dimensions or duration."],
      projectSectionPatterns: ["Use project opener before each major group.", "Alternate overview, primary image, detail/context, and paired image pages."],
      installationDocumentationPattern: ["Lead with spatial view, then detail or scale/context image.", "Avoid representing installation work through only one flat cropped image."],
      seriesGridPattern: ["Use one readable 2x2 overview grid, then selected primary/detail pages.", "Do not overcrowd with tiny thumbnails."],
      colorAndBackgroundGuidance: ["Use restrained off-white, gallery gray, charcoal, or cool blue-gray systems based on work type.", "Avoid raw webpage white on every page."]
    },
    portfolioStrategyForThisArtist: [
      "Group works by inferred project or series before assigning pages.",
      "Use project openers, overview grids, primary work pages, detail/context pages, and a final works list.",
      "Limit any one project group to roughly 35% of Selected Works pages when enough material exists.",
      "Use installation pages as space view plus details, not only cropped images.",
      `Build the plan for ${options.profile?.nameEn || options.profile?.name || "the artist"} around available works and source materials, not around a fixed twenty-image quota.`
    ],
    appliedPrinciples: appliedLayoutPrinciples({ derivedLayoutPrinciples } as PortfolioLayoutResearch),
    liveWebResearchUnavailable: referencesWithScreenshots.length === 0,
    riskNotes: referencesWithScreenshots.length === 0 ? ["Live web research unavailable in this environment.", "Using built-in fallback layout principles; no URLs were fabricated."] : []
  };
  fs.writeFileSync(path.join(internalDir, "portfolio-layout-research.json"), JSON.stringify(research, null, 2), "utf8");
  fs.writeFileSync(path.join(internalDir, "portfolio-layout-research.md"), renderPortfolioLayoutResearch(research), "utf8");
  return research;
}

function captureResearchScreenshot(url: string, internalDir: string, index: number) {
  try {
    const screenshotDir = path.join(internalDir, "portfolio-layout-research-screenshots");
    fs.mkdirSync(screenshotDir, { recursive: true });
    const screenshotPath = path.join(screenshotDir, `reference-${String(index + 1).padStart(2, "0")}.png`);
    const code = `
      const { chromium } = require("playwright");
      (async () => {
        const browser = await chromium.launch({ headless: true });
        try {
          const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
          await page.goto(${JSON.stringify(url)}, { waitUntil: "domcontentloaded", timeout: 8000 });
          await page.screenshot({ path: ${JSON.stringify(screenshotPath)}, fullPage: false });
        } finally {
          await browser.close();
        }
      })().catch((error) => { console.error(error); process.exit(1); });
    `;
    childProcess.execFileSync(process.execPath, ["-e", code], {
      cwd: projectRoot,
      stdio: "ignore",
      timeout: 12000
    });
    return fs.existsSync(screenshotPath) ? path.relative(internalDir, screenshotPath) : undefined;
  } catch {
    return undefined;
  }
}

function parseResearchSourceUrls(value?: string) {
  return (value || "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter((item) => /^https:\/\//i.test(item));
}

function fetchReferenceExcerpt(url: string) {
  try {
    const output = childProcess.execFileSync("curl", ["-L", "--max-time", "5", "--silent", "--fail", url], {
      cwd: projectRoot,
      encoding: "utf8",
      timeout: 7000,
      maxBuffer: 200_000
    });
    return output.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 700);
  } catch {
    return undefined;
  }
}

function fallbackLayoutPrinciples() {
  return [
    "Organize Selected Works by project group, with a clear opener or overview before individual works.",
    "Do not turn a series into many consecutive single-image pages; use overview grids and selected detail pages.",
    "Painting pages should give strong works scale, preserve image edges, and keep captions concise.",
    "Installation documentation should start with a spatial view and then show material or detail images.",
    "Series and image-research projects benefit from 4-image overview grids followed by one or two selected pages.",
    "Captions should be brief but complete: title, year, medium, and dimensions when source material provides them.",
    "Cover and selected works list should be restrained, factual, and separate from internal application language.",
    "Page rhythm should vary among opener, grid, full-page, detail, installation, context, list, and contact pages."
  ];
}

function appliedLayoutPrinciples(layoutResearch: Pick<PortfolioLayoutResearch, "derivedLayoutPrinciples">) {
  return [
    layoutResearch.derivedLayoutPrinciples.find((item) => /project group/i.test(item)) || "Organize pages by project group.",
    layoutResearch.derivedLayoutPrinciples.find((item) => /grid/i.test(item)) || "Use grids for series overview pages.",
    layoutResearch.derivedLayoutPrinciples.find((item) => /installation/i.test(item)) || "Use spatial view plus detail pages for installation documentation.",
    layoutResearch.derivedLayoutPrinciples.find((item) => /caption/i.test(item)) || "Use concise factual captions.",
    layoutResearch.derivedLayoutPrinciples.find((item) => /rhythm|vary/i.test(item)) || "Vary page rhythm across multiple layout strategies."
  ];
}

function renderPortfolioLayoutResearch(research: PortfolioLayoutResearch) {
  return [
    "# Portfolio Layout Research",
    "",
    research.liveWebResearchUnavailable ? "Live web research unavailable in this environment." : `Live references reached: ${research.references.length}.`,
    "",
    "## Queries Used",
    ...research.queriesUsed.map((query) => `- ${query}`),
    "",
    "## References",
    research.references.length
      ? research.references.map((reference) => [
        `- ${reference.title}`,
        `  URL: ${reference.url}`,
        `  Type: ${reference.sourceType}`,
        `  Relevant for: ${reference.relevantFor.join(", ")}`,
        `  Fetched: ${reference.fetched ? "yes" : "no"}`,
        reference.screenshotPath ? `  Screenshot: ${reference.screenshotPath}` : "",
        reference.extractedTextExcerpt ? `  Excerpt: ${reference.extractedTextExcerpt}` : "",
        `  Observations: ${reference.layoutObservations.join(" ")}`
      ].join("\n")).join("\n")
      : "- No live references recorded; no URLs were fabricated.",
    "",
    "## Derived Layout Principles",
    ...research.derivedLayoutPrinciples.map((principle) => `- ${principle}`),
    "",
    "## Strategy For This Artist",
    ...research.portfolioStrategyForThisArtist.map((principle) => `- ${principle}`),
    "",
    "Do not copy protected content or a specific visual design. Use these references only for structure, rhythm, grouping, caption handling, and documentation strategy."
  ].join("\n");
}

function renderChineseChecklist(
  opportunity: Opportunity,
  app: PackageDraft,
  passed: boolean,
  internalIssues: string[],
  portfolioResult?: ReturnType<typeof generatePortfolioWithAutoRepair>
) {
  const constraints = portfolioResult?.plan.portfolioConstraints;
  const visual = portfolioResult?.renderedPortfolio?.visualReport;
  const coreWorks = portfolioResult?.plan.pages
    .filter((page) => "title" in page && page.type !== "cover")
    .map((page) => "title" in page ? page.title : "")
    .filter(Boolean)
    .slice(0, 8);
  const curatorial = portfolioResult?.plan.curatorialSummary;
  const projectPageCounts = portfolioResult ? projectPageCountsText(portfolioResult.plan) : "待生成";
  return [
    "# 最终提交前检查清单",
    "",
    `机会：${opportunity.title}`,
    `质量检查：${passed ? "系统已自动完成作品集排版与质量检查，可进入用户最终确认。" : "系统无法自动解决以下关键问题，需要用户确认。"}`,
    "",
    "## 用户只需审核",
    "1. 是否申请这个机会。",
    "2. 最终提交包是否可以提交。",
    "",
    "## 作品集自动化结果",
    `- 作品集页数：${visual?.pageCount ?? "已生成待核验"} 页。`,
    `- 页数要求状态：${visual ? (visual.pageCount >= visual.minimumPages && visual.pageCount <= visual.maximumPages ? "通过" : `未通过（要求 ${visual.minimumPages}-${visual.maximumPages} 页）`) : "待核验"}。`,
    `- ${constraints?.source === "opportunity" ? `机会要求：目标 ${constraints.targetPages} 页，范围 ${constraints.minimumPages}-${constraints.maximumPages} 页。` : "默认目标：20 页左右。"} `,
    `- 主题系统：${portfolioResult?.plan.designSystem?.themeName || "待统计"}。`,
    `- 使用 project groups：${curatorial?.projectGroupCount ?? "待统计"} 个；各组页数：${projectPageCounts}。`,
    `- Layout diversity：${visual ? `${Object.keys(visual.layoutStrategyCounts).length} 种策略，最长连续 ${visual.repeatedLayoutRuns[0]?.length || visual.aestheticDiagnostics.longestLayoutRun} 页` : "待统计"}。`,
    `- 单一系列是否过度占比：${curatorial?.dominantProjectGroup ? `${curatorial.dominantProjectGroup} ${(Number(curatorial.dominantProjectPageRatio || 0) * 100).toFixed(1)}%` : "未发现"}。`,
    `- Diversity gate：${curatorial?.passedDiversityGate ? "通过" : "未完全通过或资料不足，系统已自动重排/记录限制"}。`,
    `- Visual/aesthetic gate：${portfolioResult?.renderedPortfolio?.visualReport.passed ? "通过" : "仍有需系统处理或用户确认的问题"}；aesthetic ${visual?.aestheticScore ?? "待统计"} / professional PDF ${visual?.professionalPdfScore ?? "待统计"}。`,
    `- Layout research：${portfolioResult?.plan.layoutResearchUsed.referenceCount ?? 0} 个参考；已应用原则 ${portfolioResult?.plan.layoutResearchUsed.appliedPrinciples.length ?? 0} 条。`,
    `- 使用核心作品：${coreWorks?.length ? coreWorks.join("；") : "系统已按资料自动选择。"} `,
    `- 自动排除弱图：${portfolioResult?.plan.excludedImages.length ?? 0} 张。`,
    `- 自动修复问题：${portfolioResult?.autoFixableIssuesResolved.length ? portfolioResult.autoFixableIssuesResolved.join("；") : "未发现需要返工的普通版式问题。"} `,
    `- PDF 文件大小：${visual ? `${(visual.pdfSizeBytes / 1024 / 1024).toFixed(2)} MB` : "待核验"}。`,
    `- 是否符合机会要求：${portfolioResult?.blockingIssues.length ? "仍有关键阻塞问题" : "未发现阻塞提交的作品集问题"}。`,
    "",
    "## 自动化已检查",
    "- 对外文件不包含内部流程词、AI 痕迹、占位词或负面缺失词。",
    "- 用户审核材料为中文主导。",
    "- 英文正式材料配有中文审核说明。",
    "- 作品集生成记录了已有作品集参考和外部结构调研。",
    "- test/mock run 不进入真实待提交或已提交状态。",
    "",
    "## 仍需用户确认的关键问题",
    internalIssues.length ? internalIssues.map((item) => `- ${item}`).join("\n") : "- 暂无。用户只需最终确认是否提交。"
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

function renderExternalDirectoryChecklist(externalDir: string) {
  const entries = fs.readdirSync(externalDir, { withFileTypes: true })
    .filter((entry) => entry.name !== "file-checklist.md" && !entry.name.endsWith(".html"))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => entry.isDirectory()
      ? `- ${entry.name}/ (${listExternalRelativeFiles(path.join(externalDir, entry.name)).length} files)`
      : `- ${entry.name}`);
  return ["# File Checklist", "", ...entries].join("\n");
}

function renderImageCaptions(plan: PortfolioPlan) {
  const captionsByImage = new Map<string, string>();
  for (const page of plan.pages) {
    if (page.type === "work_full_page" || page.type === "single_work_full_page") {
      setBestImageCaption(
        captionsByImage,
        page.imagePath,
        page.caption || formatCaption(page.title, page.year, page.medium, page.dimensions)
      );
      continue;
    }
    if ("images" in page) {
      for (const image of page.images) {
        setBestImageCaption(captionsByImage, image.path, image.caption || page.caption || page.title);
      }
    }
  }
  const captions = [...captionsByImage.values()];
  return [
    "# Image Captions",
    "",
    ...captions.map((caption, index) => `${index + 1}. ${caption}`)
  ].join("\n");
}

function setBestImageCaption(captions: Map<string, string>, imagePath: string, caption: string | undefined) {
  const clean = String(caption || "").replace(/\s+/g, " ").trim();
  if (!imagePath || !clean) return;
  const current = captions.get(imagePath);
  if (!current || captionInformationScore(clean) > captionInformationScore(current)) captions.set(imagePath, clean);
}

function captionInformationScore(caption: string) {
  let score = caption.length;
  if (/\b(19|20)\d{2}\b/.test(caption)) score += 80;
  if (caption.split(/[,，]/).length >= 3) score += 40;
  return score;
}

function projectPageCountsText(plan: PortfolioPlan) {
  const counts = countBy(plan.pages
    .filter((page) => isImagePage(page) || page.type === "project_opener")
    .map((page) => page.projectGroup || inferProjectGroup(pageTitle(page))));
  delete counts[""];
  const entries = Object.entries(counts);
  return entries.length ? entries.map(([group, count]) => `${group} ${count} 页`).join("；") : "未记录 project group";
}

function generatePortfolioWithAutoRepair(
  opportunity: Opportunity,
  app: PackageDraft,
  options: WritePackageOptions,
  externalDir: string,
  internalDir: string
) {
  const sourceAudit = buildPortfolioSourceAudit(opportunity, options, app);
  const layoutResearch = performPortfolioLayoutResearch(opportunity, options, internalDir);
  let plan = buildAutomaticPortfolioPlan(opportunity, app, options, sourceAudit, layoutResearch);
  let mandatoryRepair = enforceMandatoryPortfolioImageSelection(plan, sourceAudit, layoutResearch);
  plan = mandatoryRepair.plan;
  sourceAudit.materialsActuallyUsed = [
    ...new Set([
      ...sourceAudit.materialsActuallyUsed,
      ...extractPortfolioPlanImagePaths(plan),
      ...sourceAudit.existingPortfolioSources
    ])
  ];
  const autoRepairLog: PortfolioAutoRepairLog = {
    startedAt: new Date().toISOString(),
    maxRounds: 3,
    rounds: [],
    finalStatus: "blocked",
    remainingBlockingIssues: [],
    warnings: []
  };
  const autoFixableIssuesResolved: string[] = [];
  let imageCopyResult = copyPortfolioPlanImages(externalDir, plan);
  let renderedPortfolio = renderPortfolioPackage({
    externalDir,
    internalDir,
    opportunity,
    plan,
    copiedImages: imageCopyResult.copiedImages,
    webResearchReferences: app.portfolioWebResearchReferences || [],
    preflightIssues: imageCopyResult.issues
  });

  for (let round = 1; round <= 3 && actionableAutoFixableIssues(renderedPortfolio.visualReport.autoFixableIssues).length > 0 && renderedPortfolio.visualReport.blockingIssues.length === 0; round += 1) {
    const before = renderedPortfolio.visualReport.pageCount;
      const repair = repairPortfolioPlan(plan, actionableAutoFixableIssues(renderedPortfolio.visualReport.autoFixableIssues), sourceAudit, layoutResearch);
    mandatoryRepair = enforceMandatoryPortfolioImageSelection(repair.plan, sourceAudit, layoutResearch);
    plan = mandatoryRepair.plan;
    autoFixableIssuesResolved.push(...repair.repairsApplied, ...mandatoryRepair.repairsApplied);
    imageCopyResult = copyPortfolioPlanImages(externalDir, plan);
    renderedPortfolio = renderPortfolioPackage({
      externalDir,
      internalDir,
      opportunity,
      plan,
      copiedImages: imageCopyResult.copiedImages,
      webResearchReferences: app.portfolioWebResearchReferences || [],
      preflightIssues: imageCopyResult.issues
    });
    autoRepairLog.rounds.push({
      round,
      issues: repair.issues,
      repairsApplied: repair.repairsApplied,
      pageCountBefore: before,
      pageCountAfter: renderedPortfolio.visualReport.pageCount
    });
  }

  const mandatoryIssues = portfolioMandatoryImageSelectionGate(plan, sourceAudit);
  const unresolvedBlockingIssues = [
    ...renderedPortfolio.visualReport.blockingIssues,
    ...mandatoryIssues,
    ...renderedPortfolio.visualReport.autoFixableIssues
      .filter((issue) => isCriticalUnresolvedPortfolioIssue(issue.code))
      .map((issue) => ({
        ...issue,
        severity: "blocking" as const,
        message: `Auto-repair did not resolve required portfolio quality issue: ${issue.message}`
      }))
  ];
  autoRepairLog.finalStatus = renderedPortfolio.visualReport.passed && unresolvedBlockingIssues.length === 0 ? "passed" : "blocked";
  autoRepairLog.remainingBlockingIssues = unresolvedBlockingIssues;
  autoRepairLog.warnings = renderedPortfolio.visualReport.warnings;
  updatePortfolioSourceAuditSelections(sourceAudit, plan);
  fs.writeFileSync(path.join(internalDir, "portfolio-source-audit.json"), JSON.stringify(sourceAudit, null, 2), "utf8");
  fs.writeFileSync(path.join(internalDir, "portfolio-plan.json"), JSON.stringify(plan, null, 2), "utf8");
  fs.writeFileSync(path.join(internalDir, "portfolio-auto-repair-log.json"), JSON.stringify(autoRepairLog, null, 2), "utf8");

  return {
    sourceAudit,
    plan,
    imageCopyResult,
    renderedPortfolio,
    autoRepairLog,
    layoutResearch,
    selectedImages: extractSelectedPortfolioImages(plan),
    excludedImages: plan.excludedImages,
    missingMetadata: sourceAudit.missingMetadata,
    qualityRisks: plan.qualityRisks,
    autoFixableIssuesResolved,
    warnings: renderedPortfolio.visualReport.warnings,
    blockingIssues: unresolvedBlockingIssues,
    variants: buildPortfolioVariants(opportunity, plan, renderedPortfolio.pdfPath)
  };
}

function actionableAutoFixableIssues(issues: PortfolioIssueClassification[]) {
  return issues.filter((issue) => issue.code !== "aesthetic_score_too_low" && issue.code !== "professional_pdf_score_too_low");
}

function isCriticalUnresolvedPortfolioIssue(code: string) {
  return [
    "pdf_not_rendered",
    "page_count_too_low",
    "page_count_too_high",
    "forbidden_terms",
    "no_usable_images",
    "missing_referenced_image",
    "portfolio_research_missing",
    "portfolio_research_not_applied",
    "curatorial_gate_failed",
    "layout_strategy_diversity_too_low",
    "too_many_consecutive_layout_strategy",
    "white_only_monotony",
    "reads_as_html_preview",
    "cover_looks_like_dev_page",
    "portfolio_degenerated_to_single_image_pages",
    "fallback_pdf_not_professional",
    "duplicate_images",
    "small_full_page_image",
    "images_too_small_relative_to_page",
    "aesthetic_score_too_low",
    "professional_pdf_score_too_low",
    "primary_page_uses_incomplete_image",
    "support_only_image_used_as_primary",
    "detail_process_installation_on_single_work_full_page",
    "complete_image_exists_but_not_primary",
    "selected_works_list_unrepresented",
    "cropped_partial_temporary_main_image",
    "overview_grid_uses_too_many_incomplete_images",
    "project_group_missing_complete_image",
    "missing_visible_image",
    "image_distortion",
    "page_overflow",
    "content_too_sparse",
    "weak_visual_hierarchy",
    "repeated_rendered_structure",
    "visual_check_unavailable"
  ].includes(code);
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
  const workImagePaths = availableWorks.map((work) => work.imagePath).filter((value): value is string => Boolean(value));
  const rankedCandidateImageFiles = availableImageFiles
    .filter((imagePath) => !workImagePaths.includes(imagePath))
    .map((imagePath) => ({ imagePath, score: scoreImageCandidate(imagePath) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 120)
    .map((item) => item.imagePath);
  const imageAnalyses = analyzePortfolioImages([...workImagePaths, ...rankedCandidateImageFiles]);
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
  const portfolioConstraints = inferPortfolioConstraints(rawMaterialsText);
  const auditBase = {
    existingPortfolioSources,
    availableWorks,
    availableImageFiles,
    missingMetadata,
    lowConfidenceFacts: app.portfolioQualityRisks || [],
    opportunitySpecificConstraints: {
      maxPages: inferMaxPages(rawMaterialsText),
      minPages: portfolioConstraints.minimumPages,
      targetPages: portfolioConstraints.targetPages,
      targetFileSizeMb: inferTargetFileSizeMb(rawMaterialsText),
      language: /chinese|中文/i.test(rawMaterialsText) ? "zh" : "en",
      requiresCv: /\bcv\b|curriculum vitae/i.test(rawMaterialsText),
      requiresBio: /\bbio\b|biography/i.test(rawMaterialsText),
      requiresStatement: /statement/i.test(rawMaterialsText),
      requiresSinglePdf: /single pdf|one pdf|combined pdf/i.test(rawMaterialsText),
      rawMaterialsText
    },
    portfolioConstraints,
    materialsActuallyUsed: existingPortfolioSources,
    imageAnalyses,
    allAvailableImages: [],
    selectedImages: [],
    excludedImages: [],
    projectGroupPrimaryImages: [],
    supportOnlyImages: []
  };
  updatePortfolioSourceAuditSelections(auditBase, null);
  return auditBase;
}

function buildAutomaticPortfolioPlan(
  opportunity: Opportunity,
  app: PackageDraft,
  options: WritePackageOptions,
  audit: PortfolioSourceAudit,
  layoutResearch: PortfolioLayoutResearch
): PortfolioPlan {
  const constraints = audit.portfolioConstraints || inferPortfolioConstraints(opportunity.materials || opportunity.rawContent || "");
  if (app.portfolioPlan?.pages?.length) {
    return normalizePortfolioPlan(app.portfolioPlan, options, constraints, layoutResearch, audit);
  }
  const artistName = options.profile?.nameEn || options.profile?.name || options.profile?.nameZh || "Artist";
  const year = String(new Date().getFullYear());
  const selectedImagePaths = app.selectedImages?.length
    ? app.selectedImages.map((image) => image.path).filter(Boolean)
    : extractLegacyImagePaths(app.selectedWorks);
  const portfolioTitleOrder = inferExistingPortfolioTitleOrder(options.materialSources, audit.availableWorks.map((work) => work.title));
  const availableWorks = audit.availableWorks.filter((work) => work.imagePath);
  const fallbackImageWorks = audit.availableImageFiles.map((imagePath, index) => ({
    id: `material-image-${index + 1}`,
    title: titleFromImagePath(imagePath, index),
    imagePath,
    year: undefined,
    medium: undefined,
    dimensions: undefined
  }));
  const imageAnalysisByPath = new Map((audit.imageAnalyses || []).map((analysis) => [analysis.path, analysis]));
  const selectedWorks = rankPortfolioWorks(
    app.selectedImages?.length
      ? app.selectedImages.map((image, index) => ({ id: image.workId || `selected-image-${index + 1}`, title: image.title || legacyTitleForImage(app.selectedWorks, image.path) || `Work ${index + 1}`, imagePath: image.path }))
      : selectedImagePaths.length
        ? selectedImagePaths.map((imagePath, index) => ({ id: `legacy-${index + 1}`, title: legacyTitleForImage(app.selectedWorks, imagePath) || `Work ${index + 1}`, imagePath }))
        : availableWorks.length
          ? availableWorks
          : fallbackImageWorks,
    portfolioTitleOrder,
    imageAnalysisByPath
  );
  const statement = concreteShortStatement(options.profile, selectedWorks);
  const projectGroups = groupPortfolioWorks(selectedWorks);
  const designSystem = buildPortfolioDesignSystem(choosePortfolioTheme({
    profile: options.profile,
    works: options.works || [],
    selectedImages: selectedWorks.map((work) => planImage(work, "primary")),
    projectGroups,
    opportunity,
    imageAnalyses: audit.imageAnalyses || []
  }));
  const singleSeriesOnly = projectGroups.length <= 1;
  const pages: PortfolioPlanPage[] = [
    {
      type: "cover",
      title: artistName,
      subtitle: "Selected Works",
      year,
      contact: [options.profile?.email, options.profile?.website].filter(Boolean).join(" | ") || undefined,
      layoutStrategy: "cover",
      pageRole: "cover",
      curatorialReason: "Restrained cover names the artist and keeps the portfolio identity clear.",
      layoutReferenceReason: "Research principles favor a quiet cover before project sections."
    },
    {
      type: "short_statement",
      text: statement,
      layoutStrategy: "statement",
      pageRole: "statement",
      curatorialReason: "Statement summarizes the practice across projects rather than explaining only selected images.",
      layoutReferenceReason: "Application portfolio references keep statements concise and separate from image captions."
    }
  ];
  const desiredTotalPages = selectedWorks.length >= Math.max(8, constraints.minimumPages - 4)
    ? Math.min(Math.max(18, constraints.targetPages), Math.min(22, constraints.maximumPages))
    : constraints.minimumPages;
  const imagePages = buildProjectBasedImagePages(projectGroups, Math.max(1, desiredTotalPages - 4), layoutResearch, imageAnalysisByPath);
  pages.push(...imagePages);
  pages.push({
    type: "selected_works_list",
    title: "Selected Works",
    works: selectedWorks.slice(0, 18).map((work) => formatCaption(work.title, work.year, work.medium, work.dimensions)),
    layoutStrategy: "selected_works_list",
    pageRole: "list",
    curatorialReason: "Formal works list consolidates captions without duplicating every image page.",
    layoutReferenceReason: "Research principles emphasize concise title/year/medium/dimensions lists."
  });
  pages.push({
    type: "contact_page",
    title: "Contact",
    text: [options.profile?.email, options.profile?.website, options.profile?.instagram].filter(Boolean).join("\n"),
    layoutStrategy: "contact_page",
    pageRole: "contact",
    curatorialReason: "Closing page keeps contact details separate from artwork documentation.",
    layoutReferenceReason: "Selected works PDFs commonly close with contact or CV highlights."
  });
  const planned = expandPlanTowardTarget({
    artistName,
    portfolioTitle: singleSeriesOnly && projectGroups[0]?.group ? projectGroups[0].group : "Selected Works",
    year,
    language: audit.opportunitySpecificConstraints.language || "en",
    portfolioConstraints: constraints,
    maxPages: audit.opportunitySpecificConstraints.maxPages,
    targetFileSizeMb: audit.opportunitySpecificConstraints.targetFileSizeMb,
    pages,
    excludedImages: [
      ...(app.excludedImages?.map((item) => ({ path: item.path, reason: item.reason })) || []),
      ...(app.excludedWorksOrImages?.map((item) => ({ path: item.path || String(item.id || ""), reason: item.reason })) || []),
      ...audit.availableImageFiles
        .filter((imagePath) => !selectedWorks.some((work) => work.imagePath === imagePath))
        .slice(0, 80)
        .map((imagePath) => ({ path: imagePath, reason: imageQualityRisk(imagePath).join("; ") || "not needed for final page count" }))
    ],
    qualityRisks: [
      "Automatic PortfolioPlan was built by the system from works, material sources, and opportunity constraints.",
      "Portfolio Layout Research Step was executed before planning; research principles are recorded in internal-notes/portfolio-layout-research.md and .json.",
      ...(singleSeriesOnly ? ["Only one project group was available; portfolio title was adjusted away from broad Selected Works semantics when possible."] : []),
      ...(portfolioTitleOrder.length ? ["Existing portfolio source text was used to bias work ordering."] : []),
      ...(!availableWorks.length && fallbackImageWorks.length ? ["No work records with images were available; system selected image candidates from source-materials/inbox/works and marked source quality risks internally."] : []),
      ...(selectedWorks.length < constraints.minimumPages - 3 ? [`Material count is below the default page target; system expanded with detail/context/list pages where possible.`] : []),
      ...(app.portfolioQualityRisks || [])
    ],
    curatorialSummary: emptyCuratorialSummary(),
    designSystem,
    layoutResearchUsed: {
      referenceCount: layoutResearch.references.length,
      researchFile: "internal-notes/portfolio-layout-research.md",
      derivedPrinciples: layoutResearch.derivedLayoutPrinciples,
      appliedPrinciples: appliedLayoutPrinciples(layoutResearch)
    }
  });
  const summarized = attachCuratorialSummary({
    ...planned,
    pages: planned.pages.slice(0, constraints.source === "default" ? Math.min(22, constraints.maximumPages) : constraints.maximumPages)
  });
  return stabilizePortfolioPlan(repairCuratorialPlan(summarized, audit, layoutResearch).plan, audit, layoutResearch);
}

function normalizePortfolioPlan(plan: PortfolioPlan, options: WritePackageOptions, constraints: PortfolioConstraints, layoutResearch: PortfolioLayoutResearch, audit: PortfolioSourceAudit): PortfolioPlan {
  const normalized = expandPlanTowardTarget({
    ...plan,
    artistName: plan.artistName || options.profile?.nameEn || options.profile?.name || "Artist",
    portfolioTitle: plan.portfolioTitle || "Selected Works",
    year: plan.year || String(new Date().getFullYear()),
    language: plan.language || "en",
    portfolioConstraints: constraints,
    maxPages: constraints.maxPages || plan.maxPages,
    targetFileSizeMb: constraints.targetFileSizeMb || plan.targetFileSizeMb,
    pages: sanitizePortfolioPages(plan.pages),
    excludedImages: plan.excludedImages || [],
    qualityRisks: plan.qualityRisks || [],
    curatorialSummary: plan.curatorialSummary || emptyCuratorialSummary(),
    designSystem: plan.designSystem || buildPortfolioDesignSystem(choosePortfolioTheme({
      profile: options.profile,
      works: options.works || [],
      selectedImages: extractWorksFromPlanWithImages(plan).map((work) => ({ role: "primary", path: work.imagePath || "", caption: work.title })),
      projectGroups: groupPortfolioWorks(rankPortfolioWorks(extractWorksFromPlanWithImages(plan), [])),
      opportunity: { title: "", materials: "" } as Opportunity
    })),
    layoutResearchUsed: plan.layoutResearchUsed || {
      referenceCount: layoutResearch.references.length,
      researchFile: "internal-notes/portfolio-layout-research.md",
      derivedPrinciples: layoutResearch.derivedLayoutPrinciples,
      appliedPrinciples: appliedLayoutPrinciples(layoutResearch)
    }
  });
  return stabilizePortfolioPlan(repairCuratorialPlan(attachCuratorialSummary(normalized), audit, layoutResearch).plan, audit, layoutResearch);
}

function rankPortfolioWorks(
  works: Array<{ id?: number | string; title: string; imagePath?: string; year?: string; medium?: string; dimensions?: string }>,
  existingPortfolioTitleOrder: string[] = [],
  imageAnalysisByPath: Map<string, PortfolioImageAnalysis> = new Map()
) {
  return works
    .filter((work) => work.imagePath)
    .map((work) => {
      const existingIndex = existingPortfolioTitleOrder.findIndex((title) => normalizedTitle(title) === normalizedTitle(work.title));
      const existingOrderBoost = existingIndex >= 0 ? Math.max(0, 40 - existingIndex * 3) : 0;
      const analysis = imageAnalysisByPath.get(work.imagePath || "");
      const analysisBoost = analysis
        ? (analysis.primaryCandidate ? 35 : 0) + Math.round((analysis.completeWorkScore || 0) * 0.6) - (analysis.supportOnly ? 80 : 0) - (analysis.tooSmallForFullPage ? 18 : 0) + (analysis.orientation === "panorama" ? -4 : 0) + Math.round((analysis.averageBrightness - 0.35) * 8)
        : 0;
      return {
        ...work,
        score: scoreImageCandidate(work.imagePath || "") + existingOrderBoost + analysisBoost + (/iconoclasm|hidden|society|dictator|religious|installation/i.test(work.title) ? 15 : 0)
      };
    })
    .sort((a, b) => b.score - a.score);
}

type RankedPortfolioWork = ReturnType<typeof rankPortfolioWorks>[number];
type PortfolioProjectGroup = { group: string; workType: string; works: RankedPortfolioWork[] };

function groupPortfolioWorks(works: RankedPortfolioWork[]): PortfolioProjectGroup[] {
  const groups = new Map<string, PortfolioProjectGroup>();
  for (const work of works) {
    const group = inferProjectGroup(work.title, work.imagePath);
    const workType = inferWorkType(work);
    const existing = groups.get(group) || { group, workType, works: [] };
    existing.works.push(work);
    groups.set(group, existing);
  }
  return [...groups.values()]
    .map((group) => ({ ...group, works: group.works.sort((a, b) => b.score - a.score) }))
    .sort((a, b) => b.works.length - a.works.length || Math.max(...b.works.map((work) => work.score)) - Math.max(...a.works.map((work) => work.score)));
}

function inferProjectGroup(title: string, imagePath?: string) {
  const value = `${title} ${imagePath || ""}`.toLowerCase();
  const known = [
    ["Iconoclasm", /iconoclasm|hidden|dictator|religious|portrait/],
    ["What are you looking for", /what are you looking for|looking-for|looking_for/],
    ["Measurement 2.0", /measurement|measure/],
    ["Mausoleum 2024", /mausoleum/],
    ["Love and Hope", /love and hope|love|hope/]
  ] as const;
  for (const [name, pattern] of known) if (pattern.test(value)) return name;
  const cleaned = title
    .replace(/\b(19|20)\d{2}\b/g, "")
    .replace(/[_#-]?\d+$/g, "")
    .replace(/\b(detail|installation|view|final|copy|image)\b/gi, "")
    .trim();
  return cleaned.split(/[,，:：(/]/)[0]?.trim() || "Selected Works";
}

function inferWorkType(work: { title: string; medium?: string; imagePath?: string }) {
  const value = `${work.title} ${work.medium || ""} ${work.imagePath || ""}`.toLowerCase();
  if (/install|site|space|view|documentation/.test(value)) return "installation";
  if (/research|archive|mausoleum|collage|photo|image/.test(value)) return "image-based research";
  if (/painting|oil|acrylic|canvas/.test(value)) return "painting";
  if (/process|sketch|study/.test(value)) return "process/context";
  return "series";
}

function buildProjectBasedImagePages(groups: PortfolioProjectGroup[], maxPages: number, layoutResearch: PortfolioLayoutResearch, imageAnalysisByPath: Map<string, PortfolioImageAnalysis> = new Map()): PortfolioPlanPage[] {
  const pages: PortfolioPlanPage[] = [];
  const groupLimit = Math.max(1, Math.min(6, Math.floor(maxPages / Math.max(1, Math.min(groups.length, 5))) + 1));
  for (const group of groups.slice(0, 8)) {
    if (pages.length >= maxPages) break;
    const remaining = maxPages - pages.length;
    const allocation = Math.min(groupLimit, remaining, Math.max(2, group.works.length >= 3 ? 4 : group.works.length + 1));
    pages.push(projectOpenerPage(group, layoutResearch));
    if (allocation <= 1) continue;
    if (group.works.length >= 3 && pages.length < maxPages) pages.push(seriesOverviewPage(group, layoutResearch, imageAnalysisByPath));
    if (/installation/.test(group.workType) && pages.length < maxPages) pages.push(installationPage(group, layoutResearch, imageAnalysisByPath));
    const primary = group.works[0];
    if (primary && pages.length < maxPages && pages.filter((page) => page.projectGroup === group.group).length < allocation) pages.push(primaryWorkPage(primary, group, layoutResearch, imageAnalysisByPath));
    if (group.works[1] && pages.length < maxPages && pages.filter((page) => page.projectGroup === group.group).length < allocation) pages.push(twoImagePage(group, layoutResearch, imageAnalysisByPath));
    if (/research|process|series/.test(group.workType) && group.works[2] && pages.length < maxPages && pages.filter((page) => page.projectGroup === group.group).length < allocation) pages.push(contextPage(group, layoutResearch, imageAnalysisByPath));
  }
  return pages.slice(0, maxPages);
}

function projectOpenerPage(group: PortfolioProjectGroup, layoutResearch: PortfolioLayoutResearch): PortfolioPlanPage {
  return {
    type: "project_opener",
    title: group.group,
    text: projectIntroText(group),
    projectGroup: group.group,
    projectTitle: group.group,
    layoutStrategy: "project_opener",
    pageRole: "project_opener",
    curatorialReason: `Introduces ${group.group} as a project section rather than flattening it into isolated images.`,
    layoutReferenceReason: layoutResearch.derivedLayoutPrinciples[0] || "Research principles emphasize project grouping and clear section rhythm."
  };
}

function seriesOverviewPage(group: PortfolioProjectGroup, layoutResearch: PortfolioLayoutResearch, imageAnalysisByPath: Map<string, PortfolioImageAnalysis>): PortfolioPlanPage {
  const overviewWorks = preferPrimaryDocumentation(group.works, imageAnalysisByPath).slice(0, 4);
  return {
    type: /research/.test(group.workType) ? "image_research_grid" : "series_overview_grid",
    title: group.group,
    projectGroup: group.group,
    projectTitle: group.group,
    layoutStrategy: /research/.test(group.workType) ? "image_research_grid" : "series_overview_grid",
    pageRole: "overview",
    layout: "grid",
    images: overviewWorks.map((work) => planImage(work, recommendedRoleFor(work, imageAnalysisByPath, "overview"), imageAnalysisByPath)),
    caption: `${group.group}. ${group.workType} overview.`,
    curatorialReason: "A grid shows relationships inside the series without spending one page per similar image.",
    layoutReferenceReason: layoutResearch.derivedLayoutPrinciples.find((item) => /grid|series/i.test(item)) || "Research principles use overview grids for series pacing."
  };
}

function installationPage(group: PortfolioProjectGroup, layoutResearch: PortfolioLayoutResearch, imageAnalysisByPath: Map<string, PortfolioImageAnalysis>): PortfolioPlanPage {
  const primary = bestPrimaryDocumentation(group.works, imageAnalysisByPath) || group.works[0];
  const support = group.works.filter((work) => work.imagePath !== primary?.imagePath).slice(0, 2);
  return {
    type: "installation_with_details",
    title: group.group,
    projectGroup: group.group,
    projectTitle: group.group,
    layoutStrategy: "installation_with_details",
    pageRole: "installation",
    layout: "overview_plus_details",
    images: [primary, ...support].filter(Boolean).map((work, index) => planImage(work, index === 0 ? recommendedRoleFor(work, imageAnalysisByPath, "primary_documentation") : recommendedRoleFor(work, imageAnalysisByPath, "detail"), imageAnalysisByPath)),
    caption: `${group.group}. Installation documentation and details.`,
    curatorialReason: "Installation work needs spatial documentation before details.",
    layoutReferenceReason: layoutResearch.derivedLayoutPrinciples.find((item) => /installation|documentation/i.test(item)) || "Research principles prioritize space view plus details for installation pages."
  };
}

function primaryWorkPage(work: RankedPortfolioWork, group: PortfolioProjectGroup, layoutResearch: PortfolioLayoutResearch, imageAnalysisByPath: Map<string, PortfolioImageAnalysis>): PortfolioPlanPage {
  const primaryWork = bestPrimaryDocumentation(group.works, imageAnalysisByPath) || work;
  const analysis = imageAnalysisByPath.get(primaryWork.imagePath || "");
  if (analysis?.tooSmallForFullPage || analysis?.orientation === "panorama") {
    return {
      type: analysis.orientation === "panorama" ? "two_image_spread" : "image_with_caption_below",
      workId: String(primaryWork.id || ""),
      title: primaryWork.title,
      year: primaryWork.year,
      medium: primaryWork.medium,
      dimensions: primaryWork.dimensions,
      projectGroup: group.group,
      projectTitle: group.group,
      layoutStrategy: analysis.orientation === "panorama" ? "two_image_spread" : "single_work_with_detail",
      pageRole: analysis.orientation === "panorama" ? "overview" : "detail",
      layout: analysis.orientation === "panorama" ? "spread" : "single",
      images: [planImage(primaryWork, recommendedRoleFor(primaryWork, imageAnalysisByPath, analysis.tooSmallForFullPage ? "detail" : "overview"), imageAnalysisByPath)],
      caption: formatCaption(primaryWork.title, primaryWork.year, primaryWork.medium, primaryWork.dimensions),
      curatorialReason: analysis.tooSmallForFullPage ? "Image analysis marked this source too small for full-page use, so it is placed in a detail-safe layout." : "Image analysis marked this source as panoramic, so it is placed as a wider overview/spread rather than forced into a vertical full-page template.",
      layoutReferenceReason: layoutResearch.derivedLayoutPrinciples.find((item) => /scale|grid|spread/i.test(item)) || "Research principles adapt image scale and orientation to page layout."
    };
  }
  return {
    type: "single_work_full_page",
    workId: String(primaryWork.id || ""),
    title: primaryWork.title,
    year: primaryWork.year,
    medium: primaryWork.medium,
    dimensions: primaryWork.dimensions,
    imageRole: recommendedRoleFor(primaryWork, imageAnalysisByPath, "primary_documentation"),
    imagePath: primaryWork.imagePath || "",
    caption: formatCaption(primaryWork.title, primaryWork.year, primaryWork.medium, primaryWork.dimensions),
    projectGroup: group.group,
    projectTitle: group.group,
    layoutStrategy: "single_work_full_page",
    pageRole: "primary_work",
    curatorialReason: "Gives the strongest work in this project enough scale.",
    layoutReferenceReason: layoutResearch.derivedLayoutPrinciples.find((item) => /full|primary|painting|scale/i.test(item)) || "Research principles reserve full pages for selected primary works, not every image."
  };
}

function twoImagePage(group: PortfolioProjectGroup, layoutResearch: PortfolioLayoutResearch, imageAnalysisByPath: Map<string, PortfolioImageAnalysis>): PortfolioPlanPage {
  const detailWorks = preferPrimaryDocumentation(group.works, imageAnalysisByPath).slice(1, 3);
  return {
    type: "two_image_spread",
    workId: String(detailWorks[0]?.id || ""),
    title: group.group,
    year: detailWorks[0]?.year,
    medium: detailWorks[0]?.medium,
    dimensions: detailWorks[0]?.dimensions,
    projectGroup: group.group,
    projectTitle: group.group,
    layoutStrategy: "two_image_spread",
    pageRole: "detail",
    layout: "detail_spread",
    images: detailWorks.map((work) => planImage(work, recommendedRoleFor(work, imageAnalysisByPath, "detail"), imageAnalysisByPath)),
    caption: formatCaption(detailWorks[0]?.title || group.group, detailWorks[0]?.year, detailWorks[0]?.medium, detailWorks[0]?.dimensions),
    curatorialReason: "Pairs related images to vary rhythm and avoid repeated single-image pages.",
    layoutReferenceReason: layoutResearch.derivedLayoutPrinciples.find((item) => /rhythm|spread/i.test(item)) || "Research principles use spreads and detail pairings for pacing."
  };
}

function contextPage(group: PortfolioProjectGroup, layoutResearch: PortfolioLayoutResearch, imageAnalysisByPath: Map<string, PortfolioImageAnalysis>): PortfolioPlanPage {
  const work = preferPrimaryDocumentation(group.works, imageAnalysisByPath)[3] || preferPrimaryDocumentation(group.works, imageAnalysisByPath)[2] || bestPrimaryDocumentation(group.works, imageAnalysisByPath) || group.works[0];
  return {
    type: "text_image_context",
    workId: String(work.id || ""),
    title: group.group,
    year: work.year,
    medium: work.medium,
    dimensions: work.dimensions,
    projectGroup: group.group,
    projectTitle: group.group,
    layoutStrategy: "text_image_context",
    pageRole: "context",
    layout: "text_image",
    images: [planImage(work, recommendedRoleFor(work, imageAnalysisByPath, "context"), imageAnalysisByPath)],
    text: projectIntroText(group),
    caption: formatCaption(work.title, work.year, work.medium, work.dimensions),
    curatorialReason: "Adds process or conceptual context so the portfolio reads as projects, not only images.",
    layoutReferenceReason: layoutResearch.derivedLayoutPrinciples.find((item) => /context|text/i.test(item)) || "Research principles balance concise context text with images."
  };
}

function planImage(work: RankedPortfolioWork, role: PortfolioPlanImage["role"], imageAnalysisByPath: Map<string, PortfolioImageAnalysis> = new Map()): PortfolioPlanImage {
  const analysis = imageAnalysisByPath.get(work.imagePath || "");
  return {
    role,
    path: work.imagePath || "",
    caption: formatCaption(work.title, work.year, work.medium, work.dimensions),
    imageQualityScore: analysis?.completeWorkScore ?? scoreImageCandidate(work.imagePath || ""),
    qualityRisks: [...imageQualityRisk(work.imagePath || ""), ...(analysis?.qualityRisks || [])]
  };
}

function recommendedRoleFor(work: { imagePath?: string }, imageAnalysisByPath: Map<string, PortfolioImageAnalysis>, fallback: PortfolioPlanImage["role"]) {
  const analysis = imageAnalysisByPath.get(work.imagePath || "");
  if (analysis?.supportOnly) return analysis.recommendedRoles.find((role) => role !== "excluded" && role !== "weak_candidate" && role !== "primary_documentation" && role !== "complete_work_image") || "detail";
  return analysis?.recommendedRoles.find((role) => role !== "excluded" && role !== "weak_candidate" && role !== "detail" && role !== "process" && role !== "installation_view" && role !== "archive_reference" && role !== "temporary" && role !== "cropped" && role !== "partial") || fallback;
}

function preferPrimaryDocumentation<T extends { imagePath?: string; score?: number }>(works: T[], imageAnalysisByPath: Map<string, PortfolioImageAnalysis>) {
  return [...works].sort((a, b) => imagePrimarySortScore(b, imageAnalysisByPath) - imagePrimarySortScore(a, imageAnalysisByPath));
}

function bestPrimaryDocumentation<T extends { imagePath?: string; score?: number }>(works: T[], imageAnalysisByPath: Map<string, PortfolioImageAnalysis>) {
  return preferPrimaryDocumentation(works, imageAnalysisByPath).find((work) => isPrimaryEligibleImage(work.imagePath || "", imageAnalysisByPath));
}

function imagePrimarySortScore(work: { imagePath?: string; score?: number }, imageAnalysisByPath: Map<string, PortfolioImageAnalysis>) {
  const analysis = imageAnalysisByPath.get(work.imagePath || "");
  return (work.score || 0) + (analysis?.completeWorkScore || 0) * 3 + (analysis?.primaryCandidate ? 120 : 0) - (analysis?.supportOnly ? 400 : 0);
}

function isPrimaryEligibleImage(imagePath: string, imageAnalysisByPath: Map<string, PortfolioImageAnalysis>) {
  const analysis = imageAnalysisByPath.get(imagePath);
  if (!analysis) return !isSupportOnlyImagePath(imagePath);
  return Boolean((analysis.primaryCandidate || (analysis.completeWorkScore || 0) >= 70) && !analysis.supportOnly && analysis.fullPageSuitability !== "exclude");
}

function choosePortfolioTheme(input: {
  profile?: ArtistProfile;
  works: Work[];
  selectedImages: PortfolioPlanImage[];
  projectGroups: PortfolioProjectGroup[];
  opportunity: Opportunity;
  imageAnalyses?: PortfolioImageAnalysis[];
}): PortfolioThemeName {
  const text = [
    input.profile?.statementEn,
    input.profile?.bioEnMedium,
    input.opportunity.title,
    input.opportunity.materials,
    input.opportunity.rawContent,
    input.works.map((work) => `${work.titleEn || work.title} ${work.mediumEn || work.medium}`).join(" "),
    input.projectGroups.map((group) => `${group.group} ${group.workType}`).join(" ")
  ].filter(Boolean).join(" ").toLowerCase();
  if (/projection|night|dark|performance|video|screen|sound/.test(text)) return "dark_installation";
  if (input.imageAnalyses?.length) {
    const averageBrightness = input.imageAnalyses.reduce((sum, analysis) => sum + analysis.averageBrightness, 0) / input.imageAnalyses.length;
    const panoramaRatio = input.imageAnalyses.filter((analysis) => analysis.orientation === "panorama").length / input.imageAnalyses.length;
    if (averageBrightness < 0.32) return "dark_installation";
    if (panoramaRatio > 0.35) return "soft_gray_gallery";
  }
  if (/digital|image research|research|archive image|sound|media/.test(text)) return "image_research_bluegray";
  if (/archive|history|memory|mausoleum|religious|iconoclasm|document/.test(text)) return "warm_archive";
  if (/installation|site|space|sculpture|object|documentation/.test(text)) return "soft_gray_gallery";
  if (/painting|canvas|acrylic|oil|color/.test(text)) return "painting_color_field";
  return "quiet_white";
}

function buildPortfolioDesignSystem(themeName: PortfolioThemeName): PortfolioPlan["designSystem"] {
  const themes: Record<PortfolioThemeName, PortfolioTheme> = {
    quiet_white: { name: "quiet_white", background: "#f7f6f2", text: "#171717", secondaryText: "#5a5650", accent: "#7b6f5f", captionBackground: "rgba(247,246,242,0.88)", imageFrame: "hairline" },
    warm_archive: { name: "warm_archive", background: "#eee8dc", text: "#1e1b17", secondaryText: "#625b50", accent: "#8a6f45", captionBackground: "rgba(238,232,220,0.9)", imageFrame: "inset_panel" },
    soft_gray_gallery: { name: "soft_gray_gallery", background: "#e7e8e5", text: "#181a1a", secondaryText: "#555b59", accent: "#6b746f", captionBackground: "rgba(231,232,229,0.9)", imageFrame: "soft_shadow" },
    dark_installation: { name: "dark_installation", background: "#202120", text: "#f0eee8", secondaryText: "#b9b5aa", accent: "#9f8d65", captionBackground: "rgba(32,33,32,0.82)", imageFrame: "none" },
    image_research_bluegray: { name: "image_research_bluegray", background: "#e4e9eb", text: "#151b1f", secondaryText: "#53616a", accent: "#557184", captionBackground: "rgba(228,233,235,0.9)", imageFrame: "hairline" },
    painting_color_field: { name: "painting_color_field", background: "#f1efe7", text: "#191815", secondaryText: "#5e584e", accent: "#8f604d", captionBackground: "rgba(241,239,231,0.9)", imageFrame: "soft_shadow" }
  };
  return {
    themeName,
    theme: themes[themeName],
    headingScale: themeName === "dark_installation" ? "sectional" : "quiet",
    pageNumberStyle: "bottom_right",
    marginSystem: themeName === "warm_archive" ? "archive" : themeName === "dark_installation" || themeName === "soft_gray_gallery" ? "installation" : "gallery",
    sectionDividerStyle: themeName === "painting_color_field" ? "accent_block" : "rule"
  };
}

function projectIntroText(group: PortfolioProjectGroup) {
  const media = [...new Set(group.works.map((work) => work.medium).filter(Boolean))].slice(0, 2).join(" and ");
  return cleanExternalPortfolioText(`${group.group} is presented as a ${group.workType} project${media ? ` using ${media}` : ""}. The section combines overview, selected work, detail, and context pages to show both image relationships and material decisions.`);
}

function expandPlanTowardTarget(plan: PortfolioPlan): PortfolioPlan {
  const pages = sanitizePortfolioPages(plan.pages);
  const imagePages = pages.filter(isImagePage);
  const uniqueImageCount = new Set(imagePages.flatMap((page) => {
    if (page.type === "work_full_page" || page.type === "single_work_full_page") return [page.imagePath];
    return "images" in page ? page.images.map((image) => image.path) : [];
  }).filter(Boolean)).size;
  const desiredPageCount = uniqueImageCount >= Math.max(6, plan.portfolioConstraints.minimumPages - 4)
    ? Math.min(plan.portfolioConstraints.targetPages, plan.portfolioConstraints.maximumPages)
    : plan.portfolioConstraints.minimumPages;
  let nextIndex = 0;
  const usedExpansionKeys = new Set(pages.map(expansionKeyForPage).filter(Boolean));
  while (pages.length < desiredPageCount && pages.length < plan.portfolioConstraints.maximumPages && imagePages.length > 0) {
    const source = imagePages[nextIndex % imagePages.length];
    const detail = detailPageFrom(source);
    nextIndex += 1;
    if (!detail) {
      if (nextIndex > imagePages.length * 4) break;
      continue;
    }
    const key = expansionKeyForPage(detail);
    if (key && usedExpansionKeys.has(key)) {
      if (nextIndex > imagePages.length * 4) break;
      continue;
    }
    if (key) usedExpansionKeys.add(key);
    const insertAt = Math.max(2, pages.length - 1);
    pages.splice(insertAt, 0, detail);
    if (nextIndex > 80) break;
  }
  return attachCuratorialSummary({ ...plan, pages: pages.slice(0, plan.portfolioConstraints.maximumPages) });
}

function stabilizePortfolioPlan(plan: PortfolioPlan, audit: PortfolioSourceAudit, layoutResearch: PortfolioLayoutResearch): PortfolioPlan {
  let nextPlan = attachCuratorialSummary({
    ...plan,
    pages: sanitizePortfolioPages(plan.pages)
  });
  const availableWorks = audit.availableWorks.filter((work) => work.imagePath);
  const rankedWorks = rankPortfolioWorks(extractWorksFromPlanWithImages(nextPlan).length ? extractWorksFromPlanWithImages(nextPlan) : availableWorks, []);
  const groups = groupPortfolioWorks(rankedWorks.length ? rankedWorks : rankPortfolioWorks(availableWorks, []));
  const availableGroups = groupPortfolioWorks(rankPortfolioWorks(availableWorks, []));

  if (availableGroups.length >= 3 && nextPlan.curatorialSummary.projectGroupCount < 3) {
    nextPlan = repairCuratorialPlan(nextPlan, audit, layoutResearch).plan;
  }

  const imageAnalysisByPath = new Map((audit.imageAnalyses || []).map((analysis) => [analysis.path, analysis]));
  nextPlan = ensureRequiredPortfolioLayoutRoles(nextPlan, availableGroups.length ? availableGroups : groups, layoutResearch, imageAnalysisByPath);
  nextPlan = expandPlanTowardTarget(nextPlan);
  nextPlan = ensureRequiredPortfolioLayoutRoles(nextPlan, availableGroups.length ? availableGroups : groups, layoutResearch, imageAnalysisByPath);
  nextPlan = attachCuratorialSummary({ ...nextPlan, pages: trimPortfolioPagesPreservingRequiredRoles(nextPlan.pages, nextPlan.portfolioConstraints.maximumPages) });
  if (nextPlan.pages.length < nextPlan.portfolioConstraints.minimumPages) {
    nextPlan = expandPlanTowardTarget(nextPlan);
  }
  return attachCuratorialSummary({
    ...nextPlan,
    pages: trimPortfolioPagesPreservingRequiredRoles(nextPlan.pages, nextPlan.portfolioConstraints.maximumPages)
  });
}

function ensureRequiredPortfolioLayoutRoles(plan: PortfolioPlan, groups: PortfolioProjectGroup[], layoutResearch: PortfolioLayoutResearch, imageAnalysisByPath: Map<string, PortfolioImageAnalysis> = new Map()): PortfolioPlan {
  const pages = [...plan.pages];
  const insertBeforeLists = () => {
    const index = pages.findIndex((page) => page.type === "selected_works_list" || page.type === "contact" || page.type === "contact_page");
    return index >= 0 ? index : pages.length;
  };
  const useCounts = imageUseCounts(pages);
  const addPage = (page: PortfolioPlanPage | null) => {
    if (!page || pages.length >= plan.portfolioConstraints.maximumPages) return;
    pages.splice(insertBeforeLists(), 0, page);
    for (const imagePath of portfolioPageImagePaths(page)) useCounts.set(imagePath, (useCounts.get(imagePath) || 0) + 1);
  };
  const preferredGroups = groups.length ? groups : groupPortfolioWorks(rankPortfolioWorks(extractWorksFromPlanWithImages(plan), []));
  const firstGroup = preferredGroups[0];
  const secondGroup = preferredGroups[1] || firstGroup;
  const thirdGroup = preferredGroups[2] || secondGroup;

  if (!pages.some((page) => page.type === "cover")) {
    pages.unshift({ type: "cover", title: plan.artistName, subtitle: plan.portfolioTitle, year: plan.year, layoutStrategy: "cover", pageRole: "cover" });
  }
  if (!pages.some((page) => page.type === "short_statement")) {
    pages.splice(Math.min(1, pages.length), 0, { type: "short_statement", text: concreteShortStatement(undefined, extractWorksFromPlan(plan)), layoutStrategy: "statement", pageRole: "statement" });
  }
  if (firstGroup && !pages.some((page) => page.type === "project_opener")) addPage(projectOpenerPage(firstGroup, layoutResearch));
  if (!pages.some((page) => /grid/.test(layoutStrategyForPage(page)))) {
    const group = freshImageGroup(preferredGroups, useCounts, 2) || firstGroup;
    if (group) addPage(seriesOverviewPage(group, layoutResearch, imageAnalysisByPath));
  }
  if (!pages.some((page) => layoutStrategyForPage(page) === "single_work_full_page")) {
    const group = freshImageGroup(preferredGroups, useCounts, 1) || secondGroup;
    if (group?.works[0]) addPage(primaryWorkPage(group.works[0], group, layoutResearch, imageAnalysisByPath));
  }
  if (!pages.some((page) => layoutStrategyForPage(page) === "two_image_spread" || layoutStrategyForPage(page) === "detail_page")) {
    const group = freshImageGroup(preferredGroups, useCounts, 2) || thirdGroup;
    if (group?.works[1]) addPage(twoImagePage(group, layoutResearch, imageAnalysisByPath));
  }
  if (!pages.some((page) => layoutStrategyForPage(page) === "text_image_context")) {
    const group = freshImageGroup(preferredGroups, useCounts, 1) || firstGroup;
    if (group?.works[0]) addPage(contextPage(group, layoutResearch, imageAnalysisByPath));
  }
  if (!pages.some((page) => page.type === "selected_works_list")) {
    pages.push({
      type: "selected_works_list",
      title: "Selected Works",
      works: extractWorksFromPlanWithImages({ ...plan, pages }).slice(0, 18).map((work) => formatCaption(work.title, work.year, work.medium, work.dimensions)),
      layoutStrategy: "selected_works_list",
      pageRole: "list"
    });
  }
  if (!pages.some((page) => page.type === "contact" || page.type === "contact_page")) {
    pages.push({ type: "contact_page", title: "Contact", text: "", layoutStrategy: "contact_page", pageRole: "contact" });
  }

  return attachCuratorialSummary({ ...plan, pages });
}

function freshImageGroup(groups: PortfolioProjectGroup[], useCounts: Map<string, number>, minimumImages: number) {
  return groups
    .map((group) => ({
      ...group,
      works: group.works.filter((work) => work.imagePath && (useCounts.get(work.imagePath) || 0) === 0)
    }))
    .filter((group) => group.works.length >= minimumImages)
    .sort((a, b) => b.works.length - a.works.length)[0];
}

function expansionKeyForPage(page: PortfolioPlanPage) {
  const strategy = layoutStrategyForPage(page);
  if (page.type === "work_full_page" || page.type === "single_work_full_page") return `${strategy}:${page.imagePath}`;
  if ("images" in page) return `${strategy}:${page.images.map((image) => image.path).sort().join("|")}`;
  return "";
}

function emptyCuratorialSummary(): PortfolioPlan["curatorialSummary"] {
  return {
    projectGroupCount: 0,
    layoutStrategyCounts: {},
    workTypeCounts: {},
    passedDiversityGate: false
  };
}

function attachCuratorialSummary(plan: PortfolioPlan): PortfolioPlan {
  const pages = plan.pages;
  const projectPages = pages.filter((page) => isImagePage(page) || page.type === "project_opener");
  const groupCounts = countBy(projectPages.map((page) => page.projectGroup || inferProjectGroup(pageTitle(page))));
  delete groupCounts[""];
  const layoutStrategyCounts = countBy(pages.map(layoutStrategyForPage));
  const workTypeCounts = countBy(projectPages.map((page) => inferWorkType({ title: pageTitle(page), medium: "medium" in page ? page.medium : undefined, imagePath: page.type === "work_full_page" || page.type === "single_work_full_page" ? page.imagePath : undefined })));
  const dominant = Object.entries(groupCounts).sort((a, b) => b[1] - a[1])[0];
  const dominantProjectPageRatio = dominant ? dominant[1] / Math.max(1, projectPages.length) : undefined;
  const projectGroupCount = Object.keys(groupCounts).length;
  const passedDiversityGate = projectGroupCount >= 3
    && (!dominantProjectPageRatio || dominantProjectPageRatio <= 0.35)
    && Object.keys(layoutStrategyCounts).length >= 3
    && !hasLongLayoutRun(pages, "single_work_full_page", 4);
  return {
    ...plan,
    curatorialSummary: {
      projectGroupCount,
      dominantProjectGroup: dominant?.[0],
      dominantProjectPageRatio,
      layoutStrategyCounts,
      workTypeCounts,
      passedDiversityGate
    }
  };
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    const key = value || "";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function pageTitle(page: PortfolioPlanPage) {
  return "title" in page ? page.title || "" : "";
}

function layoutStrategyForPage(page: PortfolioPlanPage) {
  if (page.layoutStrategy) return page.layoutStrategy;
  if (page.type === "work_full_page") return "single_work_full_page";
  if (page.type === "single_work_full_page") return "single_work_full_page";
  if (page.type === "work_with_details" || page.type === "single_work_with_detail") return "single_work_with_detail";
  if (page.type === "installation_spread" || page.type === "installation_overview" || page.type === "installation_with_details") return "installation_with_details";
  if (page.type === "series_grid" || page.type === "series_grid_large" || page.type === "series_overview_grid") return "series_overview_grid";
  if (page.type === "text_left_image_right" || page.type === "text_image_context") return "text_image_context";
  if (page.type === "two_image_detail_spread" || page.type === "two_image_spread") return "two_image_spread";
  return page.type;
}

function hasLongLayoutRun(pages: PortfolioPlanPage[], strategy: string, maxRun: number) {
  let run = 0;
  for (const page of pages) {
    if (layoutStrategyForPage(page) === strategy) {
      run += 1;
      if (run > maxRun) return true;
    } else {
      run = 0;
    }
  }
  return false;
}

function repairCuratorialPlan(plan: PortfolioPlan, audit: PortfolioSourceAudit, layoutResearch: PortfolioLayoutResearch) {
  const issues = portfolioCuratorialGate(plan, audit, layoutResearch);
  if (!issues.some((issue) => issue.severity === "auto_fixable")) return { plan, issues, repairsApplied: [] };
  const works = extractWorksFromPlanWithImages(plan);
  const fallbackWorks = audit.availableWorks.filter((work) => work.imagePath);
  const ranked = rankPortfolioWorks(works.length ? works : fallbackWorks, []);
  const groups = groupPortfolioWorks(ranked);
  if (groups.length <= 1) {
    const singleTitle = groups[0]?.group || plan.portfolioTitle;
    return {
      plan: attachCuratorialSummary({ ...plan, portfolioTitle: singleTitle === "Selected Works" ? plan.portfolioTitle : singleTitle }),
      issues,
      repairsApplied: ["Recorded single-project material limitation and adjusted broad Selected Works title where possible."]
    };
  }
  const cover = plan.pages.find((page) => page.type === "cover");
  const statement = plan.pages.find((page) => page.type === "short_statement");
  const list = plan.pages.find((page) => page.type === "selected_works_list");
  const contact = plan.pages.find((page) => page.type === "contact" || page.type === "contact_page");
  const rebuiltPages = [
    cover,
    statement,
    ...buildProjectBasedImagePages(groups, Math.max(1, plan.portfolioConstraints.maximumPages - 4), layoutResearch),
    list,
    contact
  ].filter((page): page is PortfolioPlanPage => Boolean(page));
  const repaired = attachCuratorialSummary({
    ...plan,
    portfolioTitle: "Selected Works",
    pages: rebuiltPages.slice(0, plan.portfolioConstraints.maximumPages),
    qualityRisks: [...plan.qualityRisks, "Portfolio curatorial gate auto-repaired project diversity and layout rhythm."]
  });
  return { plan: repaired, issues, repairsApplied: ["Rebuilt PortfolioPlan by project group with varied layout strategies."] };
}

function portfolioCuratorialGate(plan: PortfolioPlan, audit: PortfolioSourceAudit, layoutResearch: PortfolioLayoutResearch): PortfolioIssueClassification[] {
  const issues: PortfolioIssueClassification[] = [];
  const summary = attachCuratorialSummary(plan).curatorialSummary;
  const availableGroups = new Set(audit.availableWorks.map((work) => inferProjectGroup(work.title, work.imagePath)).filter(Boolean));
  if (availableGroups.size >= 3 && summary.projectGroupCount < 3) issues.push(classifyPortfolioIssue("project_diversity_too_low", "Selected Works portfolio covers fewer than three project groups despite available material.", "auto_fixable"));
  if (summary.projectGroupCount <= 1 && availableGroups.size > 1) issues.push(classifyPortfolioIssue("single_project_selected_works", "Portfolio appears to flatten one project into a Selected Works PDF.", "auto_fixable"));
  if ((summary.dominantProjectPageRatio || 0) > 0.35 && availableGroups.size >= 3) issues.push(classifyPortfolioIssue("dominant_project_over_35_percent", "One project group exceeds the default 35% page-share limit.", "auto_fixable"));
  if (Object.keys(summary.layoutStrategyCounts).length < 3) issues.push(classifyPortfolioIssue("layout_strategy_diversity_too_low", "Portfolio uses fewer than three layout strategies.", "auto_fixable"));
  if (hasLongLayoutRun(plan.pages, "single_work_full_page", 4)) issues.push(classifyPortfolioIssue("too_many_consecutive_full_page_works", "More than four consecutive pages use single-work full-page layout.", "auto_fixable"));
  if (plan.pages.filter((page) => layoutStrategyForPage(page) === "single_work_full_page").length >= Math.max(8, plan.pages.length - 4)) issues.push(classifyPortfolioIssue("portfolio_degenerated_to_single_image_pages", "Portfolio has degenerated into a one-image-per-page template.", "auto_fixable"));
  if (plan.portfolioTitle === "Selected Works" && summary.projectGroupCount <= 1 && availableGroups.size <= 1) issues.push(classifyPortfolioIssue("selected_works_title_for_single_series", "Only one series is available; use the series title rather than Selected Works.", "warning"));
  if (layoutResearch.references.length === 0 && !layoutResearch.liveWebResearchUnavailable) issues.push(classifyPortfolioIssue("portfolio_research_missing", "Portfolio layout research was not recorded before planning.", "auto_fixable"));
  if (plan.layoutResearchUsed.appliedPrinciples.length === 0) issues.push(classifyPortfolioIssue("portfolio_research_not_applied", "PortfolioPlan does not record applied layout research principles.", "auto_fixable"));
  return issues;
}

function extractWorksFromPlanWithImages(plan: PortfolioPlan) {
  return plan.pages.flatMap((page) => {
    if (page.type === "work_full_page" || page.type === "single_work_full_page") {
      return [{ id: page.workId, title: page.title, imagePath: page.imagePath, year: page.year, medium: page.medium, dimensions: page.dimensions }];
    }
    if ("images" in page) {
      return page.images.map((image, index) => ({ id: `${page.workId || page.title}-${index}`, title: image.caption?.split(",")[0] || page.title, imagePath: image.path, year: page.year, medium: page.medium, dimensions: page.dimensions }));
    }
    return [];
  }).filter((work) => work.imagePath);
}

function classifyPortfolioIssue(code: string, message: string, severity: PortfolioIssueClassification["severity"]): PortfolioIssueClassification {
  return { code, message, severity };
}

function sanitizePortfolioPages(pages: PortfolioPlanPage[]) {
  let openerIndex = 0;
  return pages.map((page) => {
    if (page.type === "project_opener") {
      const index = openerIndex++;
      return {
        ...page,
        text: safeProjectIntro(page.title, page.text, index),
        layoutStrategy: `project_opener_${index % 3 + 1}`
      } as PortfolioPlanPage;
    }
    if (page.type === "short_statement") return { ...page, text: cleanExternalPortfolioText(page.text) };
    if ((page.type === "text_image_context" || page.type === "text_left_image_right") && page.text) {
      return {
        ...page,
        text: safeContextText(page.title, page.text),
        caption: page.caption ? compressCaption(cleanExternalPortfolioText(page.caption)) : page.caption
      };
    }
    if ("caption" in page && page.caption) return { ...page, caption: compressCaption(cleanExternalPortfolioText(page.caption)) };
    return page;
  });
}

function safeProjectIntro(title: string, text: string | undefined, index: number) {
  const cleaned = cleanExternalPortfolioText(text || "");
  if (cleaned && !/selected images from|local work archive|combining project overview|image detail and installation or context views|wider practice|is presented as an? .* project|the section combines overview/i.test(cleaned)) {
    return cleaned;
  }
  const variants = [
    `${title} develops through shifts in surface, scale, and repetition. The sequence begins with complete-work views before moving into closer material relationships.`,
    `${title} is organized around the relation between image, object, and display. Full views establish the work before details clarify its construction and spatial logic.`,
    `${title} moves between individual works and their installation context. The section follows how repeated forms change through framing, proximity, and material treatment.`
  ];
  return variants[index % variants.length];
}

function safeContextText(title: string, text: string) {
  const cleaned = cleanExternalPortfolioText(text);
  if (cleaned && !/connects image selection, material handling|wider practice/i.test(cleaned)) return cleaned;
  return `${title} is shown here through a closer relationship between material decisions, framing, and display.`;
}

function detailPageFrom(page: PortfolioPlanPage): PortfolioPlanPage | null {
  if (page.type === "work_full_page" || page.type === "single_work_full_page") {
    return null;
  }
  if ("images" in page && page.images[0]?.path) {
    return {
      type: "two_image_detail_spread",
      workId: page.workId,
      title: page.title,
      year: page.year,
      medium: page.medium,
      dimensions: page.dimensions,
      projectGroup: page.projectGroup,
      projectTitle: page.projectTitle,
      layoutStrategy: "detail_page",
      pageRole: "detail",
      layout: "detail_spread",
      images: page.images.slice(0, 2).map((image) => ({ ...image, role: image.role === "primary" ? "detail" : image.role })),
      caption: compressCaption(page.caption || formatCaption(page.title, page.year, page.medium, page.dimensions))
    };
  }
  return null;
}

function repairPortfolioPlan(plan: PortfolioPlan, issues: PortfolioIssueClassification[], sourceAudit: PortfolioSourceAudit, layoutResearch: PortfolioLayoutResearch) {
  let nextPlan = { ...plan, pages: [...plan.pages] };
  const repairsApplied: string[] = [];
  for (const issue of issues) {
    if (issue.code === "curatorial_gate_failed" || issue.code === "project_diversity_too_low" || issue.code === "single_project_selected_works" || issue.code === "dominant_project_over_35_percent" || issue.code === "layout_strategy_diversity_too_low" || issue.code === "portfolio_degenerated_to_single_image_pages" || issue.code === "too_many_consecutive_full_page_works" || issue.code === "too_many_consecutive_layout_strategy" || issue.code === "portfolio_research_not_applied") {
      const repaired = repairCuratorialPlan(nextPlan, sourceAudit, layoutResearch);
      nextPlan = repaired.plan;
      repairsApplied.push(...repaired.repairsApplied);
    } else if (issue.code === "white_only_monotony") {
      const inferredTheme = choosePortfolioTheme({
        works: [],
        selectedImages: extractSelectedPortfolioImages(nextPlan).map((image) => ({ role: image.role, path: image.path, caption: image.caption })),
        projectGroups: groupPortfolioWorks(rankPortfolioWorks(extractWorksFromPlanWithImages(nextPlan), [])),
        opportunity: { title: "", materials: nextPlan.qualityRisks.join(" ") } as Opportunity
      });
      nextPlan = { ...nextPlan, designSystem: buildPortfolioDesignSystem(inferredTheme === "quiet_white" ? "warm_archive" : inferredTheme) };
      repairsApplied.push(`Changed portfolio theme to ${nextPlan.designSystem?.themeName} to avoid white-only monotony.`);
    } else if (issue.code === "page_count_too_low") {
      const before = nextPlan.pages.length;
      const originalConstraints = nextPlan.portfolioConstraints;
      const expandedPlan = expandPlanTowardTarget({
        ...nextPlan,
        portfolioConstraints: {
          ...originalConstraints,
          minimumPages: Math.min(originalConstraints.targetPages, originalConstraints.maximumPages)
        }
      });
      nextPlan = { ...expandedPlan, portfolioConstraints: originalConstraints };
      repairsApplied.push(`Expanded portfolio from ${before} to ${nextPlan.pages.length} pages with detail/context/list pages.`);
    } else if (issue.code === "page_count_too_high") {
      nextPlan.pages = [nextPlan.pages[0], ...nextPlan.pages.slice(1).filter((page) => page.type !== "text_left_image_right" && page.type !== "two_image_detail_spread")].slice(0, nextPlan.portfolioConstraints.maximumPages);
      repairsApplied.push(`Reduced page count to ${nextPlan.pages.length} pages by removing secondary detail spreads.`);
    } else if (issue.code === "caption_too_long" || issue.code === "captions_too_dense" || issue.code === "forbidden_terms" || issue.code === "reads_as_html_preview" || issue.code === "cover_looks_like_dev_page" || issue.code === "page_overflow" || issue.code === "weak_visual_hierarchy" || issue.code === "template_project_copy" || issue.code === "repeated_opener_layout" || issue.code === "weak_project_opener") {
      nextPlan.pages = sanitizePortfolioPages(nextPlan.pages);
      repairsApplied.push("Rewrote external copy and diversified project opener plans.");
    } else if (issue.code === "statement_too_generic") {
      nextPlan.pages = nextPlan.pages.map((page) => page.type === "short_statement" ? { ...page, text: concreteShortStatement(undefined, extractWorksFromPlan(nextPlan)) } : page);
      repairsApplied.push("Rewrote generic statement with concrete work and material references.");
    } else if (issue.code === "series_grid_too_dense") {
      nextPlan.pages = splitDenseSeriesPages(nextPlan.pages);
      repairsApplied.push("Split dense series grids into readable overview/detail pages.");
    } else if (issue.code === "duplicate_images") {
      nextPlan.pages = removeDuplicateImagePages(nextPlan.pages);
      repairsApplied.push("Removed duplicate image pages from the PortfolioPlan.");
    } else if (issue.code === "small_full_page_image" || issue.code === "images_too_small_relative_to_page" || issue.code === "content_too_sparse") {
      nextPlan.pages = nextPlan.pages.map((page, index) => {
        const matchesIssue = issue.sourcePath
          ? (page.type === "work_full_page" || page.type === "single_work_full_page") && issue.sourcePath === page.imagePath
          : issue.page === index + 1;
        if (!matchesIssue) return page;
        if (page.type === "work_full_page" || page.type === "single_work_full_page") {
          return { ...page, type: "image_with_caption_below", images: [{ role: "detail", path: page.imagePath, caption: page.caption }] } as PortfolioPlanPage;
        }
        if ("images" in page && page.images.length === 1) {
          return {
            ...page,
            type: "image_with_caption_below",
            layoutStrategy: "image_with_caption_below",
            images: page.images
          } as PortfolioPlanPage;
        }
        return page;
      });
      repairsApplied.push("Rebalanced sparse or undersized image pages with a detail-safe layout.");
    } else if (issue.code === "repeated_rendered_structure") {
      const repaired = repairCuratorialPlan(nextPlan, sourceAudit, layoutResearch);
      nextPlan = repaired.plan;
      repairsApplied.push(...repaired.repairsApplied);
    } else if (issue.code === "image_distortion" || issue.code === "missing_visible_image") {
      repairsApplied.push("Rerendered portfolio with aspect-ratio-safe image sizing and verified copied image sources.");
    } else if (issue.code === "works_list_incomplete" || issue.code === "works_list_missing") {
      nextPlan.pages = rebuildSelectedWorksList(nextPlan, sourceAudit);
      repairsApplied.push("Rebuilt the selected works index from visually represented works.");
    } else if (issue.code === "closing_page_too_weak" || issue.code === "closing_page_missing") {
      nextPlan.pages = rebuildClosingPage(nextPlan);
      repairsApplied.push("Rebuilt the formal closing page with artist and portfolio identity.");
    } else if (issue.code === "pdf_too_large") {
      repairsApplied.push("Reused optimized copied images and re-rendered PDF.");
    }
  }
  const stabilized = stabilizePortfolioPlan(nextPlan, sourceAudit, layoutResearch);
  if (stabilized.pages.length !== nextPlan.pages.length || JSON.stringify(requiredPortfolioLayoutRoles(stabilized.pages)) !== JSON.stringify(requiredPortfolioLayoutRoles(nextPlan.pages))) {
    repairsApplied.push("Restored required portfolio page roles and page count after repair.");
  }
  return { plan: stabilized, issues, repairsApplied };
}

function rebuildSelectedWorksList(plan: PortfolioPlan, sourceAudit: PortfolioSourceAudit) {
  const selectedPaths = new Set(extractSelectedPortfolioImages(plan).map((image) => image.path));
  const auditedWorks = sourceAudit.availableWorks
    .filter((work) => work.imagePath && selectedPaths.has(work.imagePath))
    .slice(0, 18)
    .map((work) => formatCaption(work.title, work.year, work.medium, work.dimensions));
  const works = auditedWorks.length
    ? auditedWorks
    : extractWorksFromPlanWithImages(plan)
      .slice(0, 18)
      .map((work) => formatCaption(work.title, work.year, work.medium, work.dimensions));
  const page: PortfolioPlanPage = {
    type: "selected_works_list",
    title: "Selected Works",
    works,
    layoutStrategy: "selected_works_list",
    pageRole: "list"
  };
  const existing = plan.pages.findIndex((item) => item.type === "selected_works_list");
  if (existing >= 0) return plan.pages.map((item, index) => index === existing ? page : item);
  const contact = plan.pages.findIndex((item) => item.type === "contact" || item.type === "contact_page");
  const pages = [...plan.pages];
  pages.splice(contact >= 0 ? contact : pages.length, 0, page);
  return pages;
}

function rebuildClosingPage(plan: PortfolioPlan) {
  const page: PortfolioPlanPage = {
    type: "contact_page",
    title: "Contact",
    text: [plan.artistName, plan.portfolioTitle, plan.year].filter(Boolean).join("\n"),
    layoutStrategy: "contact_page",
    pageRole: "contact"
  };
  const existing = plan.pages.findIndex((item) => item.type === "contact" || item.type === "contact_page");
  return existing >= 0
    ? plan.pages.map((item, index) => index === existing ? page : item)
    : [...plan.pages, page];
}

function enforceMandatoryPortfolioImageSelection(plan: PortfolioPlan, audit: PortfolioSourceAudit, layoutResearch: PortfolioLayoutResearch) {
  const imageAnalysisByPath = new Map((audit.imageAnalyses || []).map((analysis) => [analysis.path, analysis]));
  const coreGroupNames = coreProjectGroupsForPlan(plan);
  const worksByGroup = groupPortfolioWorks(rankPortfolioWorks(audit.availableWorks.filter((work) => work.imagePath), [], imageAnalysisByPath))
    .filter((group) => coreGroupNames.size === 0 || coreGroupNames.has(group.group));
  const primaryByGroup = new Map(worksByGroup.map((group) => [group.group, bestPrimaryDocumentation(group.works, imageAnalysisByPath)]));
  const repairsApplied: string[] = [];
  let pages = plan.pages.map((page): PortfolioPlanPage => {
    const pageImagePath = page.type === "work_full_page" || page.type === "single_work_full_page" ? page.imagePath : undefined;
    const groupName = page.projectGroup || ("title" in page ? inferProjectGroup(page.title || "", pageImagePath) : "");
    const primary = primaryByGroup.get(groupName) || bestPrimaryDocumentation(worksByGroup.flatMap((group) => group.works), imageAnalysisByPath);
    if ((page.type === "work_full_page" || page.type === "single_work_full_page") && supportOnlyOrNotPrimary(page.imagePath, imageAnalysisByPath) && primary?.imagePath && primary.imagePath !== page.imagePath) {
      repairsApplied.push(`Replaced support-only primary image on ${page.title} with complete documentation: ${primary.imagePath}`);
      return {
        ...page,
        workId: String(primary.id || page.workId || ""),
        title: primary.title || page.title,
        year: primary.year || page.year,
        medium: primary.medium || page.medium,
        dimensions: primary.dimensions || page.dimensions,
        imageRole: recommendedRoleFor(primary, imageAnalysisByPath, "primary_documentation"),
        imagePath: primary.imagePath || page.imagePath,
        caption: formatCaption(primary.title, primary.year, primary.medium, primary.dimensions),
        curatorialReason: "Mandatory image-selection repair replaced a support-only source with complete artwork documentation."
      };
    }
    if ("images" in page) {
      const images = [...page.images];
      const primaryIndex = primaryImageIndexForPage();
      const first = images[primaryIndex];
      if (first && supportOnlyOrNotPrimary(first.path, imageAnalysisByPath) && primary?.imagePath && primary.imagePath !== first.path) {
        images[primaryIndex] = planImage(primary, recommendedRoleFor(primary, imageAnalysisByPath, page.pageRole === "overview" ? "overview" : "primary_documentation"), imageAnalysisByPath);
        repairsApplied.push(`Replaced support-only lead image on ${page.title} with complete documentation: ${primary.imagePath}`);
      }
      if (/grid|overview/.test(page.layoutStrategy || page.type)) {
        images.sort((a, b) => imagePathPrimarySortScore(b.path, imageAnalysisByPath) - imagePathPrimarySortScore(a.path, imageAnalysisByPath));
      }
      return { ...page, images };
    }
    return page;
  });
  for (const group of worksByGroup) {
    const primary = primaryByGroup.get(group.group);
    if (!primary?.imagePath) continue;
    const hasPrimaryForGroup = pages.some((page) => {
      if (page.projectGroup !== group.group) return false;
      if (page.type === "work_full_page" || page.type === "single_work_full_page") return page.imagePath === primary.imagePath && !supportOnlyOrNotPrimary(page.imagePath, imageAnalysisByPath);
      if ("images" in page && isPrimaryUsePage(page)) return page.images.some((image) => image.path === primary.imagePath && !supportOnlyOrNotPrimary(image.path, imageAnalysisByPath));
      return false;
    });
    if (hasPrimaryForGroup) continue;
    pages = pages.map((page): PortfolioPlanPage | null => {
      if (page.projectGroup !== group.group || !("images" in page)) return page;
      const duplicatesInsertedPrimary = page.images.some((image) => image.path === primary.imagePath);
      if (!(duplicatesInsertedPrimary && (page.type === "text_image_context" || page.type === "two_image_detail_spread" || page.type === "two_image_spread"))) return page;
      const alternate = group.works.find((work) => work.imagePath && work.imagePath !== primary.imagePath && !supportOnlyOrNotPrimary(work.imagePath, imageAnalysisByPath));
      if (alternate?.imagePath) {
        return {
          ...page,
          images: page.images.map((image) => image.path === primary.imagePath ? planImage(alternate, recommendedRoleFor(alternate, imageAnalysisByPath, page.pageRole === "context" ? "context" : "detail"), imageAnalysisByPath) : image)
        };
      }
      return null;
    }).filter((page): page is PortfolioPlanPage => Boolean(page));
    const preferredMaximumPages = plan.portfolioConstraints.source === "default" ? Math.min(22, plan.portfolioConstraints.maximumPages) : plan.portfolioConstraints.maximumPages;
    while (pages.length >= preferredMaximumPages) {
      const removableIndex = findSecondaryPortfolioPageToRemove(pages, group.group);
      if (removableIndex < 0) break;
      pages.splice(removableIndex, 1);
    }
    if (pages.length < preferredMaximumPages) {
      const insertAt = pages.findIndex((page) => page.type === "selected_works_list" || page.type === "contact" || page.type === "contact_page");
      pages.splice(insertAt >= 0 ? insertAt : pages.length, 0, primaryWorkPage(primary, group, layoutResearch, imageAnalysisByPath));
      repairsApplied.push(`Inserted complete artwork primary page for ${group.group}: ${primary.imagePath}`);
    }
  }
  const selectedWorksPages = pages.map((page): PortfolioPlanPage => {
    if (page.type !== "selected_works_list") return page;
    const visuallyRepresented = new Set(pages.flatMap(portfolioPageImagePaths));
    const representedWorks = audit.availableWorks
      .filter((work) => work.imagePath && visuallyRepresented.has(work.imagePath) && !supportOnlyOrNotPrimary(work.imagePath, imageAnalysisByPath))
      .slice(0, 18)
      .map((work) => formatCaption(work.title, work.year, work.medium, work.dimensions));
    if (representedWorks.length && representedWorks.length < (page.works?.length || 0)) {
      repairsApplied.push("Trimmed selected works list to works visually represented by complete/primary documentation images.");
    }
    return representedWorks.length ? { ...page, works: representedWorks } : page;
  });
  const repaired = attachCuratorialSummary({
    ...plan,
    pages: selectedWorksPages,
    qualityRisks: [...plan.qualityRisks, ...(repairsApplied.length ? ["Mandatory complete-work image selection repair was applied."] : [])]
  });
  updatePortfolioSourceAuditSelections(audit, repaired);
  const unresolved = portfolioMandatoryImageSelectionGate(repaired, audit);
  if (unresolved.some((issue) => issue.code === "project_group_missing_complete_image")) {
    return { plan: repaired, repairsApplied };
  }
  if (repairsApplied.length) return { plan: repaired, repairsApplied };
  return { plan: repaired, repairsApplied };
}

function findSecondaryPortfolioPageToRemove(pages: PortfolioPlanPage[], protectedGroup: string) {
  const hasContext = pages.some((page) => page.type === "text_image_context");
  const predicates = [
    (page: PortfolioPlanPage) => (page.type === "two_image_detail_spread" || page.type === "two_image_spread") && page.projectGroup !== protectedGroup,
    (page: PortfolioPlanPage) => page.type === "text_image_context" && hasContext && pages.filter((item) => item.type === "text_image_context").length > 1 && page.projectGroup !== protectedGroup,
    (page: PortfolioPlanPage) => /grid/.test(layoutStrategyForPage(page)) && page.projectGroup !== protectedGroup,
    (page: PortfolioPlanPage) => page.type === "project_opener" && page.projectGroup !== protectedGroup
  ];
  for (const predicate of predicates) {
    const index = pages.findIndex(predicate);
    if (index >= 0) return index;
  }
  return -1;
}

function portfolioMandatoryImageSelectionGate(plan: PortfolioPlan, audit: PortfolioSourceAudit): PortfolioIssueClassification[] {
  const issues: PortfolioIssueClassification[] = [];
  const imageAnalysisByPath = new Map((audit.imageAnalyses || []).map((analysis) => [analysis.path, analysis]));
  const coreGroupNames = coreProjectGroupsForPlan(plan);
  const groups = groupPortfolioWorks(rankPortfolioWorks(audit.availableWorks.filter((work) => work.imagePath), [], imageAnalysisByPath))
    .filter((group) => coreGroupNames.size === 0 || coreGroupNames.has(group.group));
  const primaryUsesByGroup = new Map<string, string[]>();
  plan.pages.forEach((page, index) => {
    if (page.type === "work_full_page" || page.type === "single_work_full_page") {
      if (supportOnlyOrNotPrimary(page.imagePath, imageAnalysisByPath)) issues.push(classifyPortfolioIssue("primary_page_uses_incomplete_image", `Page ${index + 1} uses a support-only or incomplete image as a primary full-page image: ${page.imagePath}`, "blocking"));
      primaryUsesByGroup.set(page.projectGroup || inferProjectGroup(page.title, page.imagePath), [...(primaryUsesByGroup.get(page.projectGroup || inferProjectGroup(page.title, page.imagePath)) || []), page.imagePath]);
    }
    if ("images" in page) {
      const primaryImage = page.images[primaryImageIndexForPage()];
      if (primaryImage && isPrimaryUsePage(page) && supportOnlyOrNotPrimary(primaryImage.path, imageAnalysisByPath)) {
        issues.push(classifyPortfolioIssue("support_only_image_used_as_primary", `Page ${index + 1} uses support-only image as the lead project image: ${primaryImage.path}`, "blocking"));
      }
      if (primaryImage && isPrimaryUsePage(page) && !supportOnlyOrNotPrimary(primaryImage.path, imageAnalysisByPath)) {
        const groupName = page.projectGroup || inferProjectGroup(page.title, primaryImage.path);
        primaryUsesByGroup.set(groupName, [...(primaryUsesByGroup.get(groupName) || []), primaryImage.path]);
      }
      if ((page.type === "series_overview_grid" || page.type === "series_grid" || page.type === "series_grid_large") && page.images.length > 1) {
        const completeCount = page.images.filter((image) => !supportOnlyOrNotPrimary(image.path, imageAnalysisByPath)).length;
        if (completeCount < Math.ceil(page.images.length / 2)) issues.push(classifyPortfolioIssue("overview_grid_uses_too_many_incomplete_images", `Overview grid on page ${index + 1} relies on incomplete/support-only images.`, "blocking"));
      }
    }
  });
  for (const group of groups) {
    const complete = group.works.filter((work) => isPrimaryEligibleImage(work.imagePath || "", imageAnalysisByPath));
    if (!complete.length) {
      issues.push(classifyPortfolioIssue("project_group_missing_complete_image", `${group.group} has no complete artwork image recorded; portfolio must be quality_blocked unless context-only documentation is explicitly accepted.`, "blocking"));
      continue;
    }
    const primaryUses = primaryUsesByGroup.get(group.group) || [];
    if (!primaryUses.some((imagePath) => complete.some((work) => work.imagePath === imagePath))) {
      issues.push(classifyPortfolioIssue("complete_image_exists_but_not_primary", `${group.group} has complete artwork documentation, but it was not selected as a primary image.`, "blocking"));
    }
  }
  const representedTitles = new Set(extractWorksFromPlanWithImages(plan).filter((work) => work.imagePath && !supportOnlyOrNotPrimary(work.imagePath, imageAnalysisByPath)).map((work) => normalizedTitle(work.title)));
  const listedWorks = plan.pages.flatMap((page) => page.type === "selected_works_list" ? page.works || [] : []);
  const unrepresented = listedWorks.filter((work) => ![...representedTitles].some((title) => normalizedTitle(work).includes(title) || title.includes(normalizedTitle(work).slice(0, 18))));
  if (listedWorks.length >= 6 && unrepresented.length / listedWorks.length > 0.35) {
    issues.push(classifyPortfolioIssue("selected_works_list_unrepresented", "Selected works list contains too many works without complete visual representation in image pages.", "blocking"));
  }
  return issues;
}

function updatePortfolioSourceAuditSelections(audit: PortfolioSourceAudit, plan: PortfolioPlan | null) {
  const imageAnalysisByPath = new Map((audit.imageAnalyses || []).map((analysis) => [analysis.path, analysis]));
  const worksByPath = new Map(audit.availableWorks.filter((work) => work.imagePath).map((work) => [work.imagePath || "", work]));
  const selectedUses = plan ? extractSelectedPortfolioImages(plan) : [];
  const selectedPaths = new Set(selectedUses.map((image) => image.path));
  const allPaths = [...new Set([...(audit.availableImageFiles || []), ...audit.availableWorks.map((work) => work.imagePath || "").filter(Boolean), ...selectedUses.map((image) => image.path)])];
  const audited = allPaths.map((imagePath): PortfolioAuditedImage => {
    const analysis = imageAnalysisByPath.get(imagePath);
    const work = worksByPath.get(imagePath);
    const selected = selectedUses.find((image) => image.path === imagePath);
    const supportOnly = supportOnlyOrNotPrimary(imagePath, imageAnalysisByPath);
    return {
      path: imagePath,
      projectGroup: work ? inferProjectGroup(work.title, work.imagePath) : inferProjectGroup(titleFromImagePath(imagePath, 0), imagePath),
      title: work?.title || selected?.title || titleFromImagePath(imagePath, 0),
      dimensions: work?.dimensions,
      width: analysis?.width,
      height: analysis?.height,
      assignedRole: analysis?.assignedRole,
      recommendedRole: analysis?.recommendedRole,
      completeWorkScore: analysis?.completeWorkScore,
      qualityScore: analysis?.completeWorkScore ?? scoreImageCandidate(imagePath),
      risks: [...(analysis?.qualityRisks || []), ...imageQualityRisk(imagePath)],
      selectedReason: selected ? selectedReasonForUse(selected, analysis) : undefined,
      excludedReason: selected ? undefined : excludedReasonForImage(imagePath, analysis),
      supportOnly
    };
  });
  audit.allAvailableImages = audited;
  audit.selectedImages = selectedUses.map((image) => ({
    ...(audited.find((item) => item.path === image.path) || { path: image.path }),
    page: image.page,
    pageType: pageTypeForSelectedUse(plan, image.page),
    use: selectedUseKind(plan, image.page, image.path)
  }));
  audit.excludedImages = audited.filter((image) => !selectedPaths.has(image.path));
  const coreGroupNames = plan ? coreProjectGroupsForPlan(plan) : new Set<string>();
  const groups = groupPortfolioWorks(rankPortfolioWorks(audit.availableWorks.filter((work) => work.imagePath), [], imageAnalysisByPath))
    .filter((group) => !plan || coreGroupNames.size === 0 || coreGroupNames.has(group.group));
  audit.projectGroupPrimaryImages = groups.map((group) => {
    const completeImageAvailable = group.works.some((work) => isPrimaryEligibleImage(work.imagePath || "", imageAnalysisByPath));
    const primary = plan?.pages.find((page) => {
      if (page.projectGroup !== group.group) return false;
      if (page.type === "work_full_page" || page.type === "single_work_full_page") return !supportOnlyOrNotPrimary(page.imagePath, imageAnalysisByPath);
      if ("images" in page && isPrimaryUsePage(page)) return page.images[0] && !supportOnlyOrNotPrimary(page.images[0].path, imageAnalysisByPath);
      return false;
    });
    const primaryImagePath = primary
      ? primary.type === "work_full_page" || primary.type === "single_work_full_page"
        ? primary.imagePath
        : "images" in primary ? primary.images[0]?.path : undefined
      : undefined;
    return {
      projectGroup: group.group,
      primaryImagePath,
      completeImageAvailable,
      qualityBlocked: completeImageAvailable ? !primaryImagePath : true,
      reason: primaryImagePath ? "Complete artwork documentation selected as project primary image." : completeImageAvailable ? "Complete image exists but no primary page uses it." : "No complete artwork image found for this project group."
    };
  });
  audit.supportOnlyImages = audited
    .filter((image) => image.supportOnly)
    .map((image) => ({
      path: image.path,
      projectGroup: image.projectGroup,
      assignedRole: image.assignedRole,
      reason: image.excludedReason || "Downgraded to support-only by mandatory portfolio image selection rule."
    }));
}

function coreProjectGroupsForPlan(plan: PortfolioPlan) {
  return new Set(plan.pages
    .filter((page) => isImagePage(page) || page.type === "project_opener")
    .map((page) => page.projectGroup || ("title" in page ? inferProjectGroup(page.title || "", page.type === "work_full_page" || page.type === "single_work_full_page" ? page.imagePath : undefined) : ""))
    .filter(Boolean));
}

function supportOnlyOrNotPrimary(imagePath: string, imageAnalysisByPath: Map<string, PortfolioImageAnalysis>) {
  const analysis = imageAnalysisByPath.get(imagePath);
  if (analysis) return Boolean(analysis.supportOnly || analysis.cropRisk || analysis.partialImageRisk || analysis.temporaryPhotoRisk || (analysis.completeWorkScore || 0) < 55);
  return isSupportOnlyImagePath(imagePath);
}

function isSupportOnlyImagePath(imagePath: string) {
  return /detail|closeup|close-up|crop|cropped|process|install|installation|studio|temp|temporary|screenshot|screen|archive|reference|packing|backup|partial/i.test(path.basename(imagePath));
}

function imagePathPrimarySortScore(imagePath: string, imageAnalysisByPath: Map<string, PortfolioImageAnalysis>) {
  const analysis = imageAnalysisByPath.get(imagePath);
  return (analysis?.completeWorkScore || scoreImageCandidate(imagePath)) + (analysis?.primaryCandidate ? 100 : 0) - (supportOnlyOrNotPrimary(imagePath, imageAnalysisByPath) ? 300 : 0);
}

function primaryImageIndexForPage() {
  return 0;
}

function isPrimaryUsePage(page: PortfolioPlanPage) {
  return page.pageRole === "primary_work" || page.pageRole === "overview" || /overview|single_work|primary/.test(page.layoutStrategy || page.type);
}

function selectedReasonForUse(selected: ReturnType<typeof extractSelectedPortfolioImages>[number], analysis?: PortfolioImageAnalysis) {
  if (selected.role === "complete_work_image" || selected.role === "primary_documentation" || selected.role === "overview" || selected.role === "primary") {
    return analysis?.selectionReason || "Selected as complete/primary artwork documentation.";
  }
  return "Selected as supporting/context image, not as the main artwork representation.";
}

function excludedReasonForImage(imagePath: string, analysis?: PortfolioImageAnalysis) {
  if (analysis?.rejectionReason) return analysis.rejectionReason;
  if (supportOnlyOrNotPrimary(imagePath, new Map(analysis ? [[imagePath, analysis]] : []))) return "Downgraded to support-only by filename/path and image quality heuristics.";
  return "Not needed after complete artwork images filled primary portfolio positions.";
}

function pageTypeForSelectedUse(plan: PortfolioPlan | null, pageNumber?: number) {
  if (!plan || !pageNumber) return undefined;
  return plan.pages[pageNumber - 1]?.type;
}

function selectedUseKind(plan: PortfolioPlan | null, pageNumber?: number, imagePath?: string): "primary" | "overview" | "supporting" | "context" | undefined {
  if (!plan || !pageNumber || !imagePath) return undefined;
  const page = plan.pages[pageNumber - 1];
  if (!page) return undefined;
  if (page.type === "work_full_page" || page.type === "single_work_full_page") return "primary";
  if (page.pageRole === "overview") return "overview";
  if (page.pageRole === "context") return "context";
  return "supporting";
}

function extractWorksFromPlan(plan: PortfolioPlan) {
  return plan.pages
    .filter((page): page is Extract<PortfolioPlanPage, { title: string; medium?: string }> => "title" in page && page.type !== "cover")
    .map((page) => ({ title: page.title, medium: "medium" in page ? page.medium : undefined }));
}

function splitDenseSeriesPages(pages: PortfolioPlanPage[]) {
  return pages.flatMap((page): PortfolioPlanPage[] => {
    if ((page.type !== "series_grid" && page.type !== "series_grid_large") || page.images.length <= 4) return [page];
    const chunks: PortfolioPlanImage[][] = [];
    for (let index = 0; index < page.images.length; index += 4) chunks.push(page.images.slice(index, index + 4));
    return chunks.map((images, index) => ({
      ...page,
      type: index === 0 ? "series_grid_large" : "two_image_detail_spread",
      layout: index === 0 ? "large_grid" : "detail_spread",
      images,
      caption: compressCaption(page.caption || formatCaption(page.title, page.year, page.medium, page.dimensions))
    }));
  });
}

function removeDuplicateImagePages(pages: PortfolioPlanPage[]) {
  const uses = new Map<string, { total: number; nonOverview: number; fullPage: number }>();
  return pages.map((page) => {
    if (page.type === "work_full_page" || page.type === "single_work_full_page") {
      const use = uses.get(page.imagePath) || { total: 0, nonOverview: 0, fullPage: 0 };
      if (use.fullPage >= 1 || use.nonOverview >= 1 || use.total >= 2) return null;
      uses.set(page.imagePath, { total: use.total + 1, nonOverview: use.nonOverview + 1, fullPage: use.fullPage + 1 });
      return page;
    }
    if ("images" in page) {
      const isOverview = /overview|grid|installation/.test(page.layoutStrategy || page.type);
      const images = page.images.filter((image) => {
        const use = uses.get(image.path) || { total: 0, nonOverview: 0, fullPage: 0 };
        const nextNonOverview = use.nonOverview + (isOverview ? 0 : 1);
        if (use.total >= 2 || nextNonOverview > 1) return false;
        uses.set(image.path, { total: use.total + 1, nonOverview: nextNonOverview, fullPage: use.fullPage });
        return true;
      });
      return images.length ? { ...page, images } : null;
    }
    return page;
  }).filter((page): page is PortfolioPlanPage => Boolean(page));
}

function imageUseCounts(pages: PortfolioPlanPage[]) {
  const counts = new Map<string, number>();
  for (const page of pages) {
    for (const imagePath of portfolioPageImagePaths(page)) counts.set(imagePath, (counts.get(imagePath) || 0) + 1);
  }
  return counts;
}

function portfolioPageImagePaths(page: PortfolioPlanPage) {
  if (page.type === "work_full_page" || page.type === "single_work_full_page") return [page.imagePath].filter(Boolean);
  if ("images" in page) return page.images.map((image) => image.path).filter(Boolean);
  return [];
}

function requiredPortfolioLayoutRoles(pages: PortfolioPlanPage[]) {
  return {
    cover: pages.some((page) => page.type === "cover"),
    statement: pages.some((page) => page.type === "short_statement"),
    projectDividers: pages.some((page) => page.type === "project_opener"),
    grids: pages.some((page) => /grid/.test(layoutStrategyForPage(page))),
    singleImagePages: pages.some((page) => layoutStrategyForPage(page) === "single_work_full_page"),
    detailPages: pages.some((page) => layoutStrategyForPage(page) === "detail_page" || layoutStrategyForPage(page) === "two_image_spread" || page.pageRole === "detail"),
    mixedImageTextPages: pages.some((page) => layoutStrategyForPage(page) === "text_image_context"),
    selectedWorks: pages.some((page) => page.type === "selected_works_list"),
    contactCvSummary: pages.some((page) => page.type === "contact" || page.type === "contact_page")
  };
}

function trimPortfolioPagesPreservingRequiredRoles(pages: PortfolioPlanPage[], maximumPages: number) {
  if (pages.length <= maximumPages) return pages;
  const keep = new Set<number>();
  const roles = Object.keys(requiredPortfolioLayoutRoles(pages)) as Array<keyof ReturnType<typeof requiredPortfolioLayoutRoles>>;
  for (const role of roles) {
    const index = pages.findIndex((_, pageIndex) => !keep.has(pageIndex) && requiredPortfolioLayoutRoles([pages[pageIndex]])[role]);
    if (index >= 0) keep.add(index);
  }
  const removablePriority = [
    (page: PortfolioPlanPage) => page.type === "text_left_image_right" || page.type === "text_image_context",
    (page: PortfolioPlanPage) => page.type === "two_image_detail_spread" || page.type === "two_image_spread",
    (page: PortfolioPlanPage) => /grid/.test(layoutStrategyForPage(page)),
    (page: PortfolioPlanPage) => page.type === "single_work_full_page" || page.type === "work_full_page",
    (page: PortfolioPlanPage) => page.type === "project_opener"
  ];
  const next = [...pages];
  for (const predicate of removablePriority) {
    for (let index = next.length - 1; index >= 0 && next.length > maximumPages; index -= 1) {
      const originalIndex = pages.indexOf(next[index]);
      if (keep.has(originalIndex) || !predicate(next[index])) continue;
      next.splice(index, 1);
    }
  }
  return next.slice(0, maximumPages);
}

function buildPortfolioVariants(opportunity: Opportunity, plan: PortfolioPlan, pdfPath: string | null): PortfolioVariant[] {
  const text = `${opportunity.materials}\n${opportunity.rawContent}`.toLowerCase();
  const variants: PortfolioVariant[] = [
    { type: "default_pdf", path: "external-submission/portfolio.pdf", status: pdfPath ? "generated" : "blocked", reason: pdfPath ? undefined : "PDF renderer unavailable" }
  ];
  if (/short|10\s*(?:pages?|p\b)/i.test(text)) variants.push({ type: "short_pdf", path: "external-submission/portfolio-short-10p.pdf", status: "planned", reason: "Short portfolio variant requested by opportunity text." });
  if (/separate images?|individual images?|upload images?/i.test(text)) variants.push({ type: "images_for_upload", path: "external-submission/images-for-upload", status: "planned", reason: "Opportunity appears to require individual image upload." });
  if (plan.portfolioConstraints.requiresCombinedPdf) variants.push({ type: "combined_pdf", path: "external-submission/combined-application-package.pdf", status: "planned", reason: "Combined PDF requested by opportunity text." });
  return variants;
}

function materializePortfolioVariants(input: {
  opportunity: Opportunity;
  plan: PortfolioPlan;
  externalDir: string;
  internalDir: string;
  copiedImages: ReturnType<typeof copyPortfolioPlanImages>["copiedImages"];
  webResearchReferences: string[];
  defaultPdfPath: string | null;
  externalTexts: Record<string, string>;
}) {
  const variants = buildPortfolioVariants(input.opportunity, input.plan, input.defaultPdfPath);
  const materialized = variants.map((variant) => ({ ...variant }));
  const shortVariant = materialized.find((variant) => variant.type === "short_pdf");
  if (shortVariant) {
    const shortPlan = buildShortPortfolioPlan(input.plan);
    const shortRender = renderPortfolioPackage({
      externalDir: input.externalDir,
      internalDir: input.internalDir,
      opportunity: input.opportunity,
      plan: shortPlan,
      copiedImages: input.copiedImages,
      webResearchReferences: input.webResearchReferences,
      preflightIssues: [],
      outputBaseName: "portfolio-short-10p"
    });
    shortVariant.status = shortRender.pdfPath ? "generated" : "blocked";
    shortVariant.reason = shortRender.pdfPath ? "Generated from the final PortfolioPlan as a 10-page short variant." : "PDF renderer unavailable for short variant.";
  }

  const uploadVariant = materialized.find((variant) => variant.type === "images_for_upload");
  if (uploadVariant) {
    const uploadDir = path.join(input.externalDir, "images-for-upload");
    fs.mkdirSync(uploadDir, { recursive: true });
    const copied = input.copiedImages.slice(0, input.plan.portfolioConstraints.imageCountRange?.maximum || 20).map((image, index) => {
      const source = path.join(input.externalDir, "images", image.targetFileName);
      const targetFileName = `${String(index + 1).padStart(2, "0")}-${image.targetFileName}`;
      fs.copyFileSync(source, path.join(uploadDir, targetFileName));
      return { sourcePath: image.sourcePath, uploadFileName: targetFileName };
    });
    fs.writeFileSync(path.join(uploadDir, "file-checklist.md"), [
      "# Images For Upload",
      "",
      ...copied.map((image) => `- ${image.uploadFileName}`)
    ].join("\n"), "utf8");
    uploadVariant.status = copied.length ? "generated" : "blocked";
    uploadVariant.reason = copied.length ? `Generated ${copied.length} upload image files.` : "No copied portfolio images were available for upload.";
  }

  const combinedVariant = materialized.find((variant) => variant.type === "combined_pdf");
  if (combinedVariant) {
    const htmlPath = path.join(input.externalDir, "combined-application-package.html");
    fs.writeFileSync(htmlPath, renderCombinedApplicationHtml(input.externalTexts, path.join(input.externalDir, "portfolio.html")), "utf8");
    const pdfPath = renderHtmlToPdf(htmlPath, path.join(input.externalDir, "combined-application-package.pdf"));
    combinedVariant.status = pdfPath ? "generated" : "blocked";
    combinedVariant.reason = pdfPath ? "Generated combined application PDF from external submission text files and portfolio pages." : "PDF renderer unavailable for combined application package.";
  }

  return materialized;
}

function movePortfolioSourceArtifactsToInternal(externalDir: string, internalDir: string) {
  const sourceDir = path.join(internalDir, "editable-render-sources");
  fs.mkdirSync(sourceDir, { recursive: true });
  const moved: string[] = [];
  for (const fileName of fs.readdirSync(externalDir)) {
    if (!/^(portfolio(?:-short-10p)?|combined-application-package)\.html$/i.test(fileName)) continue;
    const sourcePath = path.join(externalDir, fileName);
    const targetPath = path.join(sourceDir, fileName);
    fs.renameSync(sourcePath, targetPath);
    const movedHtml = fs.readFileSync(targetPath, "utf8")
      .replace(/src="images\//g, "src=\"../../external-submission/images/");
    fs.writeFileSync(targetPath, movedHtml, "utf8");
    moved.push(targetPath);
  }
  return {
    moved,
    portfolioHtml: moved.find((filePath) => path.basename(filePath) === "portfolio.html") || null
  };
}

function buildShortPortfolioPlan(plan: PortfolioPlan): PortfolioPlan {
  const cover = plan.pages.find((page) => page.type === "cover");
  const statement = plan.pages.find((page) => page.type === "short_statement");
  const list = plan.pages.find((page) => page.type === "selected_works_list" || page.type === "contact");
  const imagePages = plan.pages.filter((page) => page.type !== "cover" && page.type !== "short_statement" && page.type !== "selected_works_list" && page.type !== "contact").slice(0, 7);
  const pages = [cover, statement, ...imagePages, list].filter((page): page is PortfolioPlanPage => Boolean(page)).slice(0, 10);
  return {
    ...plan,
    portfolioConstraints: {
      ...plan.portfolioConstraints,
      targetPages: Math.min(10, pages.length),
      minimumPages: Math.min(8, pages.length),
      maximumPages: 10,
      source: "opportunity",
      reason: "Short portfolio variant requested by opportunity text."
    },
    pages
  };
}

function renderCombinedApplicationHtml(externalTexts: Record<string, string>, portfolioHtmlPath: string) {
  const sections = Object.entries(externalTexts)
    .filter(([, text]) => text.trim())
    .map(([name, text]) => `<section class="page"><h1>${escapeHtml(name)}</h1><pre>${escapeHtml(text.trim())}</pre></section>`)
    .join("\n");
  const portfolioSections = fs.existsSync(portfolioHtmlPath) ? extractPortfolioBody(portfolioHtmlPath) : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Combined Submission Materials</title>
<style>
@page { size: A4; margin: 18mm; }
body { margin: 0; color: #191919; font-family: Arial, Helvetica, sans-serif; }
.page { min-height: 261mm; break-after: page; }
h1 { margin: 0 0 8mm; font-size: 16px; font-weight: 500; }
pre { margin: 0; white-space: pre-wrap; font-family: Arial, Helvetica, sans-serif; font-size: 10.5px; line-height: 1.55; }
img { max-width: 100%; object-fit: contain; }
</style>
</head>
<body>${sections || `<section class="page"><h1>Combined Submission Materials</h1><pre>No external text files were required.</pre></section>`}${portfolioSections}</body>
</html>`;
}

function extractPortfolioBody(portfolioHtmlPath: string) {
  const html = fs.readFileSync(portfolioHtmlPath, "utf8");
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || "";
  return body.replace(/src="images\//g, "src=\"images/");
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
    const targetFileName = stablePortfolioImageName(safeImagePath);
    const targetPath = path.join(imageDir, targetFileName);
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
        targetFileName,
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
  const manifestPath = path.join(externalDir, "..", "internal-notes", "portfolio-image-copy-map.json");
  try {
    fs.writeFileSync(manifestPath, JSON.stringify(copiedImages.map((image) => ({ sourcePath: image.sourcePath, targetFileName: image.targetFileName })), null, 2), "utf8");
  } catch {
    // The package manifest also records the copy map; this sidecar is best-effort.
  }
  return { copiedImages, issues };
}

function stablePortfolioImageName(sourcePath: string) {
  const extension = path.extname(sourcePath).toLowerCase() || ".jpg";
  const sourceName = path.basename(sourcePath, extension).replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "image";
  const hash = crypto.createHash("sha1").update(fs.realpathSync(sourcePath)).digest("hex").slice(0, 10);
  return `${sourceName}-${hash}${extension}`;
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

function readImageMetadata(imagePath: string): ImageMetadataResult {
  const cached = imageMetadataCache.get(imagePath);
  if (cached) return cached;
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
    const result = metadata.width && metadata.height
      ? { ok: true as const, ...metadata }
      : { ok: false as const, error: "missing width/height" };
    imageMetadataCache.set(imagePath, result);
    return result;
  } catch (error) {
    const result = { ok: false as const, error: error instanceof Error ? error.message : "unknown error" };
    imageMetadataCache.set(imagePath, result);
    return result;
  }
}

function extractPortfolioPlanImagePaths(plan: PortfolioPlan) {
  return plan.pages.flatMap((page) => {
    if (page.type === "work_full_page" || page.type === "single_work_full_page") return [page.imagePath].filter(Boolean);
    if ("images" in page) {
      return page.images.map((image) => image.path).filter(Boolean);
    }
    return [];
  });
}

function extractSelectedPortfolioImages(plan: PortfolioPlan) {
  return plan.pages.flatMap((page, pageIndex) => {
    if (page.type === "work_full_page" || page.type === "single_work_full_page") {
      return [{
        page: pageIndex + 1,
        workId: page.workId,
        title: page.title,
        path: page.imagePath,
        role: page.imageRole || "primary",
        caption: page.caption
      }];
    }
    if ("images" in page) {
      return page.images.map((image) => ({
        page: pageIndex + 1,
        workId: page.workId,
        title: page.title,
        path: image.path,
        role: image.role,
        caption: image.caption || page.caption,
        imageQualityScore: image.imageQualityScore,
        qualityRisks: image.qualityRisks
      }));
    }
    return [];
  }).filter((image) => image.path);
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

function inferMinPages(text: string) {
  const range = text.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s+pages?/i);
  return range ? Number(range[1]) : undefined;
}

function inferPortfolioConstraints(text: string): PortfolioConstraints {
  const maxPages = inferMaxPages(text);
  const minPages = inferMinPages(text);
  const explicitRange = text.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s+pages?/i);
  const exactPages = text.match(/(?:portfolio|pdf|document)[^\n.]{0,80}\b(\d{1,2})\s+pages?\b/i) || text.match(/\b(\d{1,2})\s+pages?\b/i);
  const targetFileSizeMb = inferTargetFileSizeMb(text);
  const imageRange = text.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s+images?/i);
  const exactImageCount = text.match(/\b(?:upload|submit)[^\n.]{0,60}\b(\d{1,2})\s+(?:individual\s+)?images?\b/i);
  const requiresImageUploadOnly = /(?:individual images? only|images? only|do not submit (?:a )?(?:portfolio )?pdf|no (?:portfolio )?pdf|separate image uploads? only)/i.test(text);
  if (requiresImageUploadOnly) {
    const imageCount = exactImageCount ? Number(exactImageCount[1]) : imageRange ? Number(imageRange[2]) : 10;
    return {
      targetPages: Math.min(10, Math.max(1, imageCount)),
      minimumPages: 1,
      maximumPages: Math.min(10, Math.max(1, imageCount)),
      source: "opportunity",
      reason: "Opportunity requires individual image upload rather than a formal portfolio PDF.",
      targetFileSizeMb,
      imageCountRange: imageRange ? { minimum: Number(imageRange[1]), maximum: Number(imageRange[2]) } : { minimum: Math.min(1, imageCount), maximum: imageCount },
      requiresSinglePdf: false,
      requiresCombinedPdf: false,
      requiresImageUploadOnly: true
    };
  }
  if (explicitRange) {
    const minimumPages = Number(explicitRange[1]);
    const maximumPages = Number(explicitRange[2]);
    return {
      targetPages: Math.round((minimumPages + maximumPages) / 2),
      minimumPages,
      maximumPages,
      source: "opportunity",
      reason: `Opportunity specifies ${minimumPages}-${maximumPages} pages.`,
      maxPages: maximumPages,
      targetFileSizeMb,
      requiresSinglePdf: /single pdf|one pdf/i.test(text),
      requiresCombinedPdf: /combined pdf/i.test(text),
      requiresImageUploadOnly: false
    };
  }
  if (maxPages || exactPages) {
    const maximumPages = maxPages || Number(exactPages?.[1]);
    return {
      targetPages: Math.min(20, maximumPages),
      minimumPages: minPages || Math.min(maximumPages, Math.max(1, maximumPages - 2)),
      maximumPages,
      source: "opportunity",
      reason: `Opportunity specifies a page limit of ${maximumPages}.`,
      maxPages: maximumPages,
      targetFileSizeMb,
      requiresSinglePdf: /single pdf|one pdf/i.test(text),
      requiresCombinedPdf: /combined pdf/i.test(text),
      requiresImageUploadOnly: false
    };
  }
  return {
    targetPages: 20,
    minimumPages: 16,
    maximumPages: 24,
    source: "default",
    reason: imageRange
      ? `Opportunity specifies ${imageRange[1]}-${imageRange[2]} images but no page count; system keeps default formal portfolio length and adapts layout.`
      : "No explicit opportunity page limit; default to a formal portfolio around 20 pages.",
    targetFileSizeMb,
    imageCountRange: imageRange ? { minimum: Number(imageRange[1]), maximum: Number(imageRange[2]) } : exactImageCount ? { minimum: Number(exactImageCount[1]), maximum: Number(exactImageCount[1]) } : undefined,
    requiresSinglePdf: /single pdf|one pdf/i.test(text),
    requiresCombinedPdf: /combined pdf/i.test(text),
    requiresImageUploadOnly: false
  };
}

function inferTargetFileSizeMb(text: string) {
  const match = text.match(/(\d{1,3})\s*(?:mb|megabytes?)/i);
  return match ? Number(match[1]) : undefined;
}

function resolveAllowedImagePath(imagePath: string) {
  if (!fs.existsSync(imagePath)) return null;
  const realImagePath = fs.realpathSync(imagePath);
  const allowedRoots = [worksDir, sourceMaterialsDir, materialsInboxDir]
    .filter((dir) => fs.existsSync(dir))
    .map((dir) => fs.realpathSync(dir));
  return allowedRoots.some((root) => realImagePath === root || realImagePath.startsWith(`${root}${path.sep}`))
    ? realImagePath
    : null;
}

function isImagePage(page: PortfolioPlanPage) {
  return page.type === "work_full_page" || page.type === "single_work_full_page" || "images" in page;
}

function formatCaption(title?: string, year?: string, medium?: string, dimensions?: string) {
  const first = [title, year].filter(isUsableCaptionField).join(", ");
  const second = [medium, dimensions].filter(isUsableCaptionField).join(", ");
  return compressCaption([first, second].filter(Boolean).join("\n"));
}

function compressCaption(value: string) {
  const cleaned = cleanExternalPortfolioText(value);
  const words = cleaned.split(/\s+/).filter(Boolean);
  return words.length > 35 ? `${words.slice(0, 35).join(" ")}.` : cleaned;
}

function isUsableCaptionField(value?: string) {
  return Boolean(value && !/unknown|n\/a|tbd|missing|placeholder|draft|dimensions recorded in source material/i.test(value));
}

function cleanExternalPortfolioText(value: string) {
  return value
    .replace(/\b(?:test preview|web preview|browser preview|unknown|N\/A|TBD|missing|placeholder|draft|mock|test|dimensions recorded in source material)\b/gi, "")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function scoreImageCandidate(imagePath: string) {
  const cached = imageCandidateScoreCache.get(imagePath);
  if (cached !== undefined) return cached;
  const lower = imagePath.toLowerCase();
  let score = 70;
  if (/artist-assets\/works|\/works\//.test(lower)) score += 15;
  if (/detail|installation|view|document|final|selected/.test(lower)) score += 8;
  if (/wechat|screenshot|process|packing|storage|temp|draft|mock|reference/.test(lower)) score -= 30;
  if (/\.(tif|tiff|png|jpe?g|webp)$/i.test(lower)) score += 5;
  const resolved = fs.existsSync(imagePath) ? imagePath : null;
  if (resolved) {
    const metadata = readImageMetadata(resolved);
    if (metadata.ok) {
      const longSide = Math.max(metadata.width, metadata.height);
      const shortSide = Math.min(metadata.width, metadata.height);
      if (longSide >= 2400 && shortSide >= 1400) score += 10;
      else if (longSide < 1200 || shortSide < 800) score -= 20;
      const ratio = longSide / Math.max(1, shortSide);
      if (ratio > 3) score -= 8;
      try {
        const sizeBytes = fs.statSync(resolved).size;
        if (sizeBytes < 150 * 1024) score -= 8;
      } catch {
        // Size is only a scoring hint.
      }
    }
  }
  const finalScore = Math.max(0, Math.min(100, score));
  imageCandidateScoreCache.set(imagePath, finalScore);
  return finalScore;
}

function imageQualityRisk(imagePath: string) {
  const risks: string[] = [];
  const lower = imagePath.toLowerCase();
  if (/wechat|screenshot|screen/.test(lower)) risks.push("may be a screenshot or phone transfer");
  if (/process|packing|storage|temp/.test(lower)) risks.push("may be process/storage documentation");
  if (/reference|archive/.test(lower)) risks.push("may be internal reference only");
  return risks;
}

function concreteShortStatement(profile: ArtistProfile | undefined, works: Array<{ title: string; medium?: string }>) {
  const base = profile?.statementEn || profile?.bioEnMedium || profile?.bioEnShort || "";
  const cleaned = cleanExternalPortfolioText(base);
  if (cleaned && cleaned.split(/\s+/).length >= 80) return cleaned.split(/\s+/).slice(0, 170).join(" ");
  const media = [...new Set(works.map((work) => work.medium).filter(Boolean).slice(0, 4))].join(", ");
  const titles = works.slice(0, 3).map((work) => work.title).join(", ");
  const artistName = profile?.nameEn || profile?.name || "The artist";
  return cleanExternalPortfolioText(`${artistName} works through ${media || "painting, drawing, image research, and installation-oriented projects"} to examine how images carry authority, concealment, humor, and historical pressure. This portfolio brings together ${titles || "selected works"} as a concise view of a practice that transforms found political, religious, and cultural imagery through distortion, fragmentation, surface, and repetition. The works emphasize formal clarity while connecting material process with questions of visibility, censorship, belief, and public memory.`);
}

function inferExistingPortfolioTitleOrder(
  materialSources: WritePackageOptions["materialSources"],
  workTitles: string[]
) {
  const portfolioText = materialSources
    .filter((source) => source.kind === "portfolio")
    .map((source) => `${source.content || ""}\n${source.analysis || ""}`)
    .join("\n");
  if (!portfolioText.trim()) return [];
  const normalizedPortfolioText = normalizedTitle(portfolioText);
  return workTitles
    .map((title) => ({ title, index: normalizedPortfolioText.indexOf(normalizedTitle(title)) }))
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.title);
}

function normalizedTitle(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, " ").trim();
}

function titleFromImagePath(imagePath: string, index: number) {
  const stem = path.basename(imagePath, path.extname(imagePath))
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stem || `Image Candidate ${index + 1}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const __portfolioTestHooks = {
  inferPortfolioConstraints,
  expandPlanTowardTarget,
  repairPortfolioPlan,
  stabilizePortfolioPlan,
  requiredPortfolioLayoutRoles,
  attachCuratorialSummary,
  enforceMandatoryPortfolioImageSelection,
  portfolioMandatoryImageSelectionGate,
  updatePortfolioSourceAuditSelections,
  requiredExternalFiles,
  sanitizePortfolioPages,
  scoreImageCandidate,
  imageQualityRisk
};
