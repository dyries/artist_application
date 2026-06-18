import type { ArtistProfile } from "@/types/domain";

export const directApplyStopConditions = [
  "payment",
  "account login",
  "captcha",
  "sensitive authorization",
  "legal declaration",
  "privacy risk",
  "unclear eligibility",
  "unclear fees",
  "missing required materials",
  "irreversible actions"
];

export const automationRuleText = {
  automationBoundary:
    "Users may choose Codex automation, project-internal external API automation, or both. Codex automation runs inside Codex and must not depend on project external API keys. Project-internal external API automation uses providers configured in repository-root .env.local when available. Both paths must respect review, confirmation, and safety boundaries.",
  maintenance:
    "When workflow, package, material, automation, or safety rules change, update docs/rules.md and this shared machine-rule module. Remove obsolete wording or behavior unless it is intentionally kept for compatibility. Record code changes, inspections, bug fixes, optimizations, and validation results in WORKLOG.md.",
  userReviewEdits:
    "User-facing review files and package files are editable. After user edits, treat the edited file as the new source of truth and update downstream final files, database records, reports, and archive indexes. If a Chinese review edit affects an English final submission, translate the content intent into English; do not put review translations into final-only files.",
  manualOpportunityLinks:
    "Manual opportunity URLs are unverified until source URL, deadline, eligibility, fees, funding, required materials, submission method, and risks are checked. Project automation must route user-provided links through the same normalize, deduplicate, triage, verify, score, shortlist, and coverage-audit pipeline as discovered opportunities. It may fetch only public https pages and must reject localhost, private network, link-local, internal DNS, credentialed URLs, and redirected internal targets. It should use browser rendering, downloaded public attachments, and detected form fields when available. Login, captcha, payment, or sensitive authorization still requires Codex/browser or user intervention.",
  deploymentSecurity:
    "Localhost can run without authentication. Non-local deployments must require ARTIST_STUDIO_AUTH_USER plus ARTIST_STUDIO_AUTH_PASSWORD or ARTIST_STUDIO_API_TOKEN. Preserve upload, extraction, fetch, image metadata, and generated-package asset-copy limits.",
  applicantEligibility:
    "Treat the artist as Chinese / China-based unless the profile says otherwise. Recommend only opportunities that explicitly allow Chinese nationals, China-based artists, international applicants, or all nationalities; reject or downgrade incompatible local-only opportunities.",
  applicationRegion:
    "Use profile.applicationRegion as a search and ranking preference. worldwide means global search; other values prioritize opportunities in that region or explicitly online/no-location opportunities. Do not confuse application region with the artist's current location.",
  batchLimit:
    "Use profile.automationBatchLimit only as the maximum number of selected opportunities to prepare or deeply process for application packages in a run unless the user gives a newer instruction. Discovery uses separate query, candidate, triage, verification, shortlist, and application-preparation limits so a five-item recommendation shortlist never means only five candidates were discovered or verified.",
  opportunityDiscovery:
    "Opportunity discovery must run as staged search: buildSearchProfile, buildSearchPlan, generateSearchQueries, discoverCandidates, normalizeCandidates, deduplicateCandidates, triageCandidates, verifyCandidates, scoreCandidates, buildDiverseShortlist, and auditSearchCoverage. Artist mediums, themes, methods, region, language, eligibility, fee preference, and tier preference must affect queries, providers, triage, scoring, and final recommendations. Deep verification should use candidate page evidence from public HTTP fetch, browser rendering, public attachments/PDF text, form summaries, and cache where available before scoring. Query and page fetch caches must reduce repeat work without hiding stale or failed coverage. Provider failures or missing web/RSS configuration must be shown as coverage gaps, not hidden as complete search.",
  submissionApprovalMode:
    `review_required is the default and requires the final package approval node before submission. review_optional may prepare final files with fewer intermediate review artifacts when requirements are clear, but still requires explicit final submission approval. direct_apply is treated only as preparation pre-authorization for the current run up to the batch limit; final external submission still requires approval, and automation must stop for ${directApplyStopConditions.join(", ")}.`,
  opportunityFeePreference:
    "conservative is the default: prefer free or strongly funded opportunities, allow reasonable application fees, reject pay-to-show economics, and downgrade residencies with lodging/program/high participation fees. application_fee_ok allows modest application fees but still rejects booth, wall, venue, mandatory production, lodging, or high participation fees unless exceptionally justified. paid_ok allows paid exhibitions or residencies to be considered only with clear cost/risk labeling; payment always requires explicit confirmation.",
  opportunityTierPreference:
    "high_tier prioritizes museums, universities, foundations, respected residencies, credible nonprofits, and serious open calls. balanced includes high-tier and credible mid-tier opportunities. open also considers small spaces, new organizations, and experimental projects while scoring credibility and risk explicitly.",
  opportunitySelection:
    "Build a larger verified candidate pool before selecting a small cross-category shortlist, usually around five opportunities total. Exclude expired and clearly ineligible opportunities before the first review, and do not expose the raw candidate pool as a user comparison task. The first user review node is only choosing which shortlisted opportunities to apply for; do not prepare packages for new/recommended opportunities until their status is selected_by_user. After the user submits that first review, automation must continue directly into package preparation for selected opportunities without requiring a second manual run command.",
  bilingualReview:
    "User-facing review materials must be Chinese-first by default, including opportunity analysis, recommendations, risks, material summaries, work selection explanation, portfolio explanation, CV changes, and final checklist. English formal materials are allowed only when the institution requires English, and each English formal file must have a Chinese review summary. Final submission files must use only the language required by the opportunity.",
  reviewNodes:
    "The default product flow has exactly two user review nodes: choosing which opportunities to apply for, and approving the final submission package. AI should independently handle opportunity search/verification, eligibility, fees, deadlines, requirements, language, work selection, CV tailoring, bio, statement, application answers, portfolio, captions, email drafts, file checks, internal quality review, risk notes, and ordinary revision loops. If the user requests revision at the final package node, automation should re-enter package preparation automatically and return to the same final package review node.",
  fileBoundaries:
    "Every generated package must separate internal-notes, user-review, and external-submission. Internal notes may contain matching logic, risks, missing information, work-selection rationale, AI judgment, and open call analysis. User review is Chinese-first and explains what the AI changed and why. External submission contains only formal institution-facing content and must not reveal automation traces or internal workflow language.",
  portfolioQuality:
    "Portfolio work is a primary deliverable. The AI and package writer act as a professional artist portfolio editor, not a portfolio checker. Before generating a portfolio, create a Portfolio Source Audit from data.works, formal images, source materials, existing portfolio files, and opportunity constraints. If no page limit is specified, default to a formal 20-page-ish portfolio with targetPages 20, minimumPages 16, and maximumPages 24; explicit opportunity page/file/single-PDF/combined-PDF/upload constraints override the default. Then create a structured PortfolioPlan JSON; do not rely on free-text selectedWorks parsing. Default cover is Artist Name, Selected Works, year, and contact only if available; never use opportunity title, mock/test language, review committee language, placeholders, unknown/N/A/TBD, generated-by-AI wording, or selection rationale in external portfolio files. Select images, order works, write captions and statement, choose page layouts, and distinguish overview/detail/installation/process/context images automatically. Every planned image should be in an allowed material directory, readable by sharp, copied with a stable unique filename into external-submission/images, and referenced by the editable HTML render source under internal-notes. External submission keeps the formal PDF and requested upload variants, not HTML render sources. Ordinary issues such as page count, small image, missing replaceable image, long captions, dense grids, forbidden terms, PDF size, or layout imbalance must enter the auto-repair loop for up to three rounds. Only true blocking issues such as no usable works/images, non-omittable required metadata, unclear eligibility/fees, payment, login, captcha, legal/privacy risk, unavailable physical work, missing special required materials, or irreversible submission may stop for the user.",
  figmaApplicationPackageDesign:
    "When a user provides a Figma file, frame, or node for application package UI, final submission package review, or related package presentation design, implementation must use the Figma skill against the exact reference. Start with get_design_context for the exact node or frame; if truncated, use get_metadata to map the file and re-fetch only needed nodes with get_design_context. Capture get_screenshot for the exact variant before coding. Reuse this repo's existing components, design tokens, utilities, routing, state, and data-fetch patterns instead of creating a parallel system. Match spacing, layout, hierarchy, and responsive behavior closely on desktop and mobile. Use Figma-returned localhost image or SVG sources directly and do not create placeholders or add icon packages for them. Validate against the Figma reference with Playwright and iterate until visual and behavioral differences are resolved. This design workflow must not add user review nodes beyond opportunity selection and final submission package approval.",
  publicFacingTone:
    "Public-facing CVs, portfolios, bios, statements, captions, form answers, and upload files must not expose application-packaging language such as 'for this open call', 'selected for', 'draft for', 'ready-to-copy', 'final candidate', or 'submission image for'. Never write No website, No Instagram, None, N/A, to be confirmed, details to be confirmed, draft, or placeholder in upload-ready materials. If a fact or link is missing, omit it from public-facing files unless the official form requires the field; keep uncertainty and selection logic in internal notes only. Tailor internally, but make the final portfolio read like a natural artist portfolio focused on works, materials, dates, dimensions, and context.",
  concreteWriting:
    "Application writing must reduce generic AI-like abstraction. Avoid phrases such as explores the relationship, unstable site, acts as a space, investigates memory, questions boundaries, creates dialogue, liminal, embodied, and poetic resonance. Prefer concrete details: works, materials, image sources, places, archives, research actions, making methods, display methods, final outputs, and the specific relation to the opportunity.",
  testRunIsolation:
    "test-run and mock-run must be completely separated from real applications. Test/mock folders, logs, manifests, and database records must be explicitly marked test or mock. Test/mock output must not enter real pending, ready, submitted, waiting, or final-submissions state and must not make the user think a real application is ready.",
  multimodalMaterials:
    "Source materials include original file paths plus structured analysis. Use OCR, extracted text, visual summaries, audio/video metadata, derived stills, embedded media lists, and the original files together. If multimodal analysis is not configured or a file type is only metadata-indexed, explicitly mark the gap instead of pretending the file was fully understood.",
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
    opportunityDiscoveryRule: automationRuleText.opportunityDiscovery,
    opportunitySelectionRule: automationRuleText.opportunitySelection,
    reviewNodesRule: automationRuleText.reviewNodes,
    fileBoundaryRule: automationRuleText.fileBoundaries,
    reviewBilingualRule: automationRuleText.bilingualReview,
    portfolioQualityRule: automationRuleText.portfolioQuality,
    figmaApplicationPackageDesignRule: automationRuleText.figmaApplicationPackageDesign,
    publicFacingToneRule: automationRuleText.publicFacingTone,
    concreteWritingRule: automationRuleText.concreteWriting,
    testRunIsolationRule: automationRuleText.testRunIsolation,
    multimodalMaterialsRule: automationRuleText.multimodalMaterials,
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
    userReviewNodes: ["choose_opportunities", "approve_final_submission_package"],
    requireInternalUserExternalFileBoundaries: true,
    externalSubmissionMustPassSanitizer: true,
    userReviewMustBeChineseFirst: true,
    testAndMockRunsMustBeIsolated: true,
    portfolioMustUseExistingPortfolioAndWebResearch: true,
    portfolioMustUseSourceAuditAndStructuredPlan: true,
    portfolioImagesMustFailClosed: true,
    portfolioVisualGateMustInspectRenderedOutput: true,
    figmaApplicationPackageDesignMustUseExactNodeContextAndScreenshot: true,
    figmaApplicationPackageDesignMustReuseRepoPatterns: true,
    figmaApplicationPackageDesignMustBePlaywrightValidated: true,
    doNotInventLiveOpportunityFacts: true,
    projectMayFetchUserProvidedLinks: true,
    externalApiMustUseFetchedSourceTextForVerification: true,
    sourceMaterialsIncludeStructuredMultimodalAnalysis: true,
    externalApiCanDraftButCodexAutomationCanStillVerifyHighRiskFacts: true,
    applicationRegionDefaultsToWorldwide: true,
    selectedApplicationRegionMustGuideSearchAndRanking: true,
    opportunityDiscoveryMustUseStagedPipeline: true,
    opportunitySearchCoverageReportRequired: true,
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
- ${automationRuleText.opportunityDiscovery}
- ${automationRuleText.submissionApprovalMode}
- ${automationRuleText.opportunityFeePreference}
- ${automationRuleText.opportunityTierPreference}
- ${automationRuleText.opportunitySelection}
- ${automationRuleText.reviewNodes}
- ${automationRuleText.fileBoundaries}
- ${automationRuleText.bilingualReview}
- ${automationRuleText.portfolioQuality}
- ${automationRuleText.figmaApplicationPackageDesign}
- ${automationRuleText.publicFacingTone}
- ${automationRuleText.concreteWriting}
- ${automationRuleText.testRunIsolation}
- ${automationRuleText.physicalWorkAvailability}
- ${automationRuleText.finalArchive}

## Candidate Review

For each candidate, verify source URL, deadline, organization, location, eligibility, fees, funding, required materials, submission method, and risks. State whether Chinese nationals, China-based artists, international applicants, or all nationalities are eligible. Break out application fees, booth/participation/program fees, lodging, studio, production costs, stipends, awards, travel, and other funding. Preserve search coverage reports so the user can distinguish discovered candidates, triaged candidates, verified opportunities, and final recommendations.

## Package Work

For high-fit opportunities selected by the user, tailor the bio, statement, CV, work list, portfolio text, checklist, email draft, and form answers to the opportunity. Keep \`internal-notes/\`, \`user-review/\`, and \`external-submission/\` separate. Ask the user to take over only for final submission approval, captcha, payment, account login, sensitive authorization, legal declarations, privacy risk, unclear eligibility, unclear fees, missing critical materials, or irreversible actions.
`;
}
