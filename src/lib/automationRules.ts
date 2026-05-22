import type { ArtistProfile } from "@/types/domain";

export const directApplyStopConditions = [
  "payment",
  "account login",
  "captcha",
  "sensitive authorization",
  "unclear eligibility",
  "unclear fees",
  "missing required materials",
  "irreversible actions"
];

export const automationRuleText = {
  automationBoundary:
    "Users may choose Codex automation, project-internal external API automation, or both. Codex automation runs inside Codex and must not depend on project external API keys. Project-internal external API automation uses providers configured in repository-root .env.local when available. Both paths must respect review, confirmation, and safety boundaries.",
  maintenance:
    "When workflow, package, material, automation, or safety rules change, update docs/rules.md and this shared machine-rule module. Remove obsolete wording or behavior unless it is intentionally kept for compatibility. Record bug fixes, optimizations, and validation results in docs/fix-log.md.",
  userReviewEdits:
    "User-facing review files and package files are editable. After user edits, treat the edited file as the new source of truth and update downstream final files, database records, reports, and archive indexes. If a Chinese review edit affects an English final submission, translate the content intent into English; do not put review translations into final-only files.",
  manualOpportunityLinks:
    "Manual opportunity URLs are unverified until source URL, deadline, eligibility, fees, funding, required materials, submission method, and risks are checked. Project automation may fetch only public https pages and must reject localhost, private network, link-local, internal DNS, credentialed URLs, and redirected internal targets. Login, captcha, payment, dynamic rendering, or sensitive authorization requires Codex/browser or user intervention.",
  deploymentSecurity:
    "Localhost can run without authentication. Non-local deployments must require ARTIST_STUDIO_AUTH_USER plus ARTIST_STUDIO_AUTH_PASSWORD or ARTIST_STUDIO_API_TOKEN. Preserve upload, extraction, fetch, image metadata, and generated-package asset-copy limits.",
  applicantEligibility:
    "Treat the artist as Chinese / China-based unless the profile says otherwise. Recommend only opportunities that explicitly allow Chinese nationals, China-based artists, international applicants, or all nationalities; reject or downgrade incompatible local-only opportunities.",
  applicationRegion:
    "Use profile.applicationRegion as a search and ranking preference. worldwide means global search; other values prioritize opportunities in that region or explicitly online/no-location opportunities. Do not confuse application region with the artist's current location.",
  batchLimit:
    "Use profile.automationBatchLimit as the maximum number of opportunities to deeply process or prepare in a run unless the user gives a newer instruction. The value may range from 1 to 100.",
  submissionApprovalMode:
    `review_required means every package must be reviewed before submission. review_optional may prepare final files without a separate review package when requirements are clear, but should still ask before external submission. direct_apply means the user pre-authorizes submission for the current run up to the batch limit, but automation must stop for ${directApplyStopConditions.join(", ")}.`,
  opportunityFeePreference:
    "conservative is the default: prefer free or strongly funded opportunities, allow reasonable application fees, reject pay-to-show economics, and downgrade residencies with lodging/program/high participation fees. application_fee_ok allows modest application fees but still rejects booth, wall, venue, mandatory production, lodging, or high participation fees unless exceptionally justified. paid_ok allows paid exhibitions or residencies to be considered only with clear cost/risk labeling; payment always requires explicit confirmation.",
  opportunityTierPreference:
    "high_tier prioritizes museums, universities, foundations, respected residencies, credible nonprofits, and serious open calls. balanced includes high-tier and credible mid-tier opportunities. open also considers small spaces, new organizations, and experimental projects while scoring credibility and risk explicitly.",
  opportunitySelection:
    "Build a larger verified candidate pool before selecting Top 5 residencies and Top 5 exhibitions/open calls. Do not stop after finding the first five items in either category.",
  bilingualReview:
    "User-facing review materials must be Chinese-English bilingual, including form answers, bio, statement, project text, work descriptions, captions, checklist notes, and opportunity summaries. Final submission files must use only the language required by the opportunity.",
  portfolioQuality:
    "Portfolio work is a primary deliverable. Inspect source materials when possible, select works intentionally, show each selected work completely and clearly first, use installation/detail/process/context views only as supporting images, write or improve captions, and produce a polished layout. Extracted text and metadata are indexing aids only and must not replace direct content analysis.",
  physicalWorkAvailability:
    "For exhibitions requiring physical works, shipping, installation, or currently available objects, ask the user which works are still available before finalizing.",
  finalArchive:
    "After final submission or explicit final approval, copy final submission files into generated/final-submissions/YYYY-MM-DD/ with a README index, then remove or archive unnecessary intermediate drafts from the package folder."
};

export function buildMachineApplicationPreferences(profile: ArtistProfile) {
  return {
    reviewLanguage: "zh-CN",
    automationBoundaryRule: automationRuleText.automationBoundary,
    maintenanceRule: automationRuleText.maintenance,
    userReviewEditRule: automationRuleText.userReviewEdits,
    manualOpportunityLinkRule: automationRuleText.manualOpportunityLinks,
    deploymentSecurityRule: automationRuleText.deploymentSecurity,
    applicantNationalityAndBase: automationRuleText.applicantEligibility,
    preferredApplicationRegion: profile.applicationRegion || "worldwide",
    applicationRegionRule: automationRuleText.applicationRegion,
    automationBatchLimit: profile.automationBatchLimit || 5,
    submissionApprovalMode: profile.submissionApprovalMode || "review_required",
    opportunityFeePreference: profile.opportunityFeePreference || "conservative",
    opportunityTierPreference: profile.opportunityTierPreference || "high_tier",
    automationBatchRule: automationRuleText.batchLimit,
    submissionApprovalModeRule: automationRuleText.submissionApprovalMode,
    directApplyStopConditions,
    opportunityFeePreferenceRule: automationRuleText.opportunityFeePreference,
    opportunityTierPreferenceRule: automationRuleText.opportunityTierPreference,
    opportunitySelectionRule: automationRuleText.opportunitySelection,
    reviewBilingualRule: automationRuleText.bilingualReview,
    portfolioQualityRule: automationRuleText.portfolioQuality,
    physicalWorkAvailabilityRule: automationRuleText.physicalWorkAvailability,
    cleanupRule: automationRuleText.finalArchive,
    finalSubmissionLanguageRule: automationRuleText.bilingualReview,
    searchAndCostPreferencesZh: profile.preferencesZh || profile.preferences,
    searchAndCostPreferencesEn: profile.preferencesEn || profile.preferences
  };
}

export function buildPromptRules(profile: ArtistProfile) {
  return {
    reviewMaterialsMustBeBilingual: true,
    finalSubmissionLanguageDependsOnOpportunity: true,
    doNotSubmitWithoutUserApproval: true,
    doNotInventLiveOpportunityFacts: true,
    projectMayFetchUserProvidedLinks: true,
    externalApiMustUseFetchedSourceTextForVerification: true,
    externalApiCanDraftButCodexAutomationCanStillVerifyHighRiskFacts: true,
    applicationRegionDefaultsToWorldwide: true,
    selectedApplicationRegionMustGuideSearchAndRanking: true,
    maximumOpportunitiesPerRun: profile.automationBatchLimit,
    submissionApprovalMode: profile.submissionApprovalMode,
    opportunityFeePreference: profile.opportunityFeePreference,
    opportunityTierPreference: profile.opportunityTierPreference,
    directApplyStopConditions,
    rules: automationRuleText
  };
}

export function renderCodexAutomationInstructions() {
  return `# Codex Artist Automation

Use this workspace as the source of truth for the artist application workflow. The app stores materials, preferences, opportunities, and generated results; Codex handles complex interpretation, research, package production, and confirmed submission work.

## Source Files

- Read \`generated/codex/artist-snapshot.json\` first.
- The snapshot is lightweight. Inspect original files under \`artist-assets/source-materials/\`, \`artist-assets/works/\`, and \`artist-assets/inbox/\` when excerpts are insufficient.
- The live database is \`data/artist.sqlite\`.
- Write reports to \`generated/reports/\`, application packages to \`generated/applications/\`, and final approved submissions to \`generated/final-submissions/YYYY-MM-DD/\`.

## Automation Rules

- ${automationRuleText.automationBoundary}
- ${automationRuleText.maintenance}
- ${automationRuleText.userReviewEdits}
- ${automationRuleText.manualOpportunityLinks}
- ${automationRuleText.deploymentSecurity}
- ${automationRuleText.applicantEligibility}
- ${automationRuleText.applicationRegion}
- ${automationRuleText.batchLimit}
- ${automationRuleText.submissionApprovalMode}
- ${automationRuleText.opportunityFeePreference}
- ${automationRuleText.opportunityTierPreference}
- ${automationRuleText.opportunitySelection}
- ${automationRuleText.bilingualReview}
- ${automationRuleText.portfolioQuality}
- ${automationRuleText.physicalWorkAvailability}
- ${automationRuleText.finalArchive}

## Candidate Review

For each candidate, verify source URL, deadline, organization, location, eligibility, fees, funding, required materials, submission method, and risks. State whether Chinese nationals, China-based artists, international applicants, or all nationalities are eligible. Break out application fees, booth/participation/program fees, lodging, studio, production costs, stipends, awards, travel, and other funding.

## Package Work

For high-fit opportunities, tailor the bio, statement, CV, work list, portfolio text, checklist, email draft, and form answers to the opportunity. Prefer DOCX review files and add PDF previews when useful. Keep review files and final submission files separately named, for example \`review-zh.docx\` and \`submission-en.docx\`. Ask the user to take over for captcha, payment, account login, sensitive authorization, unclear eligibility, unclear fees, missing materials, or irreversible actions.
`;
}
