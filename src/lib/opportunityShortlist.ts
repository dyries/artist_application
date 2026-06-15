import type { Opportunity } from "@/types/domain";

const reviewableStatuses = new Set(["new", "recommended", "confirmed"]);
const activeStatuses = new Set([
  "selected_by_user",
  "preparing",
  "quality_blocked",
  "package_ready_for_final_review",
  "approved_for_submission",
  "ready_to_submit",
  "submitted",
  "waiting",
  "shortlisted"
]);

export function buildOpportunityShortlist(opportunities: Opportunity[], limit = 5, now = new Date()) {
  return opportunities
    .filter((opportunity) => reviewableStatuses.has(opportunity.status))
    .filter((opportunity) => !isClearlyExpired(opportunity.deadline, now))
    .filter((opportunity) => !hasClearEligibilityConflict(opportunity))
    .sort(compareShortlistPriority)
    .slice(0, Math.max(1, limit));
}

export function activeOpportunities(opportunities: Opportunity[]) {
  return opportunities
    .filter((opportunity) => activeStatuses.has(opportunity.status))
    .sort((left, right) => (right.updatedAt || right.createdAt).localeCompare(left.updatedAt || left.createdAt));
}

export function isOpportunityReviewable(opportunity: Opportunity) {
  return reviewableStatuses.has(opportunity.status);
}

function compareShortlistPriority(left: Opportunity, right: Opportunity) {
  const statusPriority = (value: Opportunity["status"]) => value === "recommended" ? 2 : value === "confirmed" ? 1 : 0;
  const manualPriority = (value: Opportunity) => /manual|user/i.test(value.source) ? 1 : 0;
  return manualPriority(right) - manualPriority(left)
    || statusPriority(right.status) - statusPriority(left.status)
    || (right.score ?? -1) - (left.score ?? -1)
    || deadlineTimestamp(left.deadline) - deadlineTimestamp(right.deadline)
    || left.id - right.id;
}

function isClearlyExpired(deadline: string, now: Date) {
  const timestamp = deadlineTimestamp(deadline);
  if (!Number.isFinite(timestamp)) return false;
  const endOfDeadlineDay = timestamp + 24 * 60 * 60 * 1000 - 1;
  return endOfDeadlineDay < now.getTime();
}

function deadlineTimestamp(deadline: string) {
  const isoDate = deadline.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1];
  if (!isoDate) return Number.POSITIVE_INFINITY;
  const timestamp = Date.parse(`${isoDate}T00:00:00Z`);
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

function hasClearEligibilityConflict(opportunity: Opportunity) {
  const text = `${opportunity.eligibility}\n${opportunity.risks}`.toLowerCase();
  return [
    /\bny state only\b/,
    /\bu\.?s\.? (?:artists|residents|citizens|work authorization) only\b/,
    /\brequires? u\.?s\.? work authorization\b/,
    /仅限美国/,
    /仅限.*州/,
    /非美国.*不可行/,
    /不接受.*中国/,
    /china-based artists? (?:are )?not eligible/
  ].some((pattern) => pattern.test(text));
}
