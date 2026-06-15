import type { PortfolioPlan, PortfolioSourceAudit, PortfolioVisualGateResult, SourceMaterial } from "@/types/domain";
import { checkPortfolioOutput, checkPortfolioPreparation } from "./portfolioQualityCheck";
import { containsChinese, concreteWritingReminder, findAiCliches } from "./languageReviewCheck";
import { assertExternalTextIsClean, findBannedExternalTerms } from "./outputSanitizer";

export type ApplicationQualityInput = {
  userReviewZh: string;
  externalTexts: Record<string, string>;
  englishExternalTexts?: Record<string, string>;
  chineseReviewSummary?: string;
  selectedWorks: string;
  portfolioText: string;
  portfolioPlan?: PortfolioPlan;
  portfolioSourceAudit?: PortfolioSourceAudit;
  portfolioVisualReport?: PortfolioVisualGateResult;
  portfolioWebResearchReferences: string[];
  materialSources: Pick<SourceMaterial, "kind" | "title" | "fileName" | "filePath" | "content" | "analysis">[];
  runMode: "real" | "test" | "mock";
};

export function runApplicationQualityChecks(input: ApplicationQualityInput) {
  const internalIssues: string[] = [];

  if (!containsChinese(input.userReviewZh)) {
    internalIssues.push("User review material must be Chinese-first and readable by the artist.");
  }

  if (input.englishExternalTexts && Object.keys(input.englishExternalTexts).length > 0 && !containsChinese(input.chineseReviewSummary || input.userReviewZh)) {
    internalIssues.push("English formal materials require a Chinese review summary.");
  }

  for (const [label, text] of Object.entries(input.externalTexts)) {
    const hits = findBannedExternalTerms(text);
    if (hits.length > 0) internalIssues.push(`${label} still contains forbidden external terms: ${hits.join(", ")}`);
    assertExternalTextIsClean(label, text);
    const cliches = findAiCliches(text);
    if (cliches.length > 0) internalIssues.push(`${label} needs concrete rewrite: ${concreteWritingReminder(cliches)}`);
  }

  const portfolioPrep = checkPortfolioPreparation({
    portfolioText: input.portfolioText,
    selectedWorks: input.selectedWorks,
    portfolioPlan: input.portfolioPlan,
    portfolioSourceAudit: input.portfolioSourceAudit,
    materialSources: input.materialSources,
    webResearchReferences: input.portfolioWebResearchReferences
  });
  if (!portfolioPrep.ok) internalIssues.push(...portfolioPrep.issues);

  const portfolioOutput = checkPortfolioOutput({
    portfolioText: input.portfolioText,
    selectedWorks: input.selectedWorks,
    portfolioPlan: input.portfolioPlan,
    portfolioSourceAudit: input.portfolioSourceAudit
  });
  if (!portfolioOutput.ok) internalIssues.push(...portfolioOutput.issues);

  if (!input.portfolioVisualReport) {
    internalIssues.push("Portfolio final visual/aesthetic gate report is missing from package readiness checks.");
  } else if (!input.portfolioVisualReport.passed) {
    internalIssues.push([
      "Portfolio final visual/aesthetic gate did not pass.",
      `pageCount=${input.portfolioVisualReport.pageCount}`,
      `aestheticScore=${input.portfolioVisualReport.aestheticScore}`,
      `professionalPdfScore=${input.portfolioVisualReport.professionalPdfScore}`,
      `blocking=${input.portfolioVisualReport.blockingIssues.map((issue) => issue.code).join(",") || "none"}`,
      `autoFixable=${input.portfolioVisualReport.autoFixableIssues.map((issue) => issue.code).join(",") || "none"}`
    ].join(" "));
  }
  const warnings = [...portfolioPrep.warnings, ...portfolioOutput.warnings];

  return {
    passed: internalIssues.length === 0,
    internalIssues,
    warnings,
    portfolioSourcesReferenced: portfolioPrep.existingPortfolioSources,
    runMode: input.runMode
  };
}
