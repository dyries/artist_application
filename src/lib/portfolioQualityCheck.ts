import type { SourceMaterial } from "@/types/domain";
import { findAiCliches } from "./languageReviewCheck";

export type PortfolioQualityInput = {
  portfolioText: string;
  selectedWorks: string;
  materialSources: Pick<SourceMaterial, "kind" | "title" | "fileName" | "filePath" | "content" | "analysis">[];
  webResearchReferences: string[];
};

export function checkPortfolioPreparation(input: PortfolioQualityInput) {
  const issues: string[] = [];
  const existingPortfolioSources = input.materialSources.filter((source) => source.kind === "portfolio");
  if (existingPortfolioSources.length === 0) {
    issues.push("No existing portfolio source was found; portfolio generation must inspect user-provided portfolio material before producing a final portfolio.");
  }
  if (input.webResearchReferences.length < 3) {
    issues.push("Portfolio generation needs at least three web/design research references recorded before final layout.");
  }
  return {
    ok: issues.length === 0,
    issues,
    existingPortfolioSources: existingPortfolioSources.map((source) => source.fileName || source.title || source.filePath).filter(Boolean)
  };
}

export function checkPortfolioOutput(input: Pick<PortfolioQualityInput, "portfolioText" | "selectedWorks">) {
  const issues: string[] = [];
  const cliches = findAiCliches(input.portfolioText);
  const captions = input.portfolioText.split(/\r?\n/).filter((line) => /[,，].*\b(19|20)\d{2}\b/.test(line));
  const selectedWorkLines = input.selectedWorks.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const selectedImageLines = selectedWorkLines.filter((line) => /Image:\s*\S+/i.test(line));

  if (selectedWorkLines.length === 0) {
    issues.push("Portfolio has no selected works; AI must select works before producing a submission portfolio.");
  }
  if (selectedImageLines.length === 0) {
    issues.push("Portfolio has no selected image paths; visual layout and file-size checks cannot be completed.");
  }
  if (selectedWorkLines.length > 0 && captions.length < Math.min(3, selectedWorkLines.length)) {
    issues.push("Portfolio text does not show enough caption-like lines with title, date, medium/dimensions rhythm.");
  }
  if (input.portfolioText.length > 0 && input.portfolioText.split(/\s+/).length / Math.max(1, selectedWorkLines.length) > 180) {
    issues.push("Portfolio text is too dense for an application portfolio; reduce captions and keep images primary.");
  }
  if (cliches.length > 0) {
    issues.push(`Portfolio statement has AI-like abstract phrases: ${cliches.join(", ")}`);
  }

  return { ok: issues.length === 0, issues };
}
