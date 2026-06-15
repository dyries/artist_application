import { findBannedExternalTerms } from "./outputSanitizer";

export function omitMissingExternalLines(text: string) {
  const internalIssues: string[] = [];
  const externalText = text
    .split(/\r?\n/)
    .filter((line) => {
      const hits = findBannedExternalTerms(line);
      if (hits.length === 0) return true;
      internalIssues.push(`Omitted missing or unsafe public detail from external text: ${line.trim()}`);
      return false;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { externalText, internalIssues };
}
