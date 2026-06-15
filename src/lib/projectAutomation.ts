import fs from "node:fs";
import path from "node:path";
import { callChatCompletion, getAiConfig } from "./aiProvider";
import { createApplication, readArtistData, recordPackageManifest, updateOpportunityStatus, upsertOpportunity } from "./db";
import { refreshOpportunityPages } from "./opportunityPages";
import { discoverOpportunityCandidates } from "./opportunitySearch";
import { generatedReportsDir } from "./paths";
import { writeApplicationPackage } from "./package";
import { asListText, extractJsonObject } from "./json";
import { aiAutomationResponseSchema, type AiAutomationResponse } from "./schemas";
import { buildPromptRules } from "./automationRules";
import type { AutomationRunMode, Opportunity, OpportunityStatus } from "@/types/domain";

const opportunityPromptTextLimit = readPositiveInt("ARTIST_STUDIO_OPPORTUNITY_PROMPT_TEXT_LIMIT", 12000);

type ProjectAutomationOptions = {
  phase?: "full" | "prepare-selected";
};

type DiscoverySummary = Awaited<ReturnType<typeof discoverOpportunityCandidates>>;

export async function runProjectAutomation(options: ProjectAutomationOptions = {}) {
  if (!getAiConfig()) {
    throw new Error("External model automation is not configured. Add DEEPSEEK_API_KEY or ARTIST_STUDIO_AI_API_KEY to .env.local and restart the project.");
  }

  const phase = options.phase || "full";
  const runMode = readRunMode();
  fs.mkdirSync(generatedReportsDir, { recursive: true });
  const initialData = readArtistData({
    materialLimit: 80,
    materialContentLimit: 3000,
    opportunityLimit: 120,
    opportunityRawContentLimit: 1500,
    applicationLimit: 20
  });
  const discovery = phase === "full"
    ? await discoverOpportunityCandidates(initialData.profile, runMode)
    : emptyDiscovery(runMode);
  const afterDiscoveryData = runMode === "real" && phase === "full" ? readArtistData({
    materialLimit: 80,
    materialContentLimit: 3000,
    opportunityLimit: 120,
    opportunityRawContentLimit: 1500,
    applicationLimit: 20
  }) : initialData;
  if (runMode === "real" && phase === "prepare-selected") {
    markSelectedOpportunitiesPreparing(afterDiscoveryData.opportunities);
  }
  const refreshTargets = phase === "prepare-selected"
    ? afterDiscoveryData.opportunities.filter(canPreparePackage)
    : afterDiscoveryData.opportunities;
  const pageFetches = await refreshOpportunityPages(
    refreshTargets,
    afterDiscoveryData.profile.automationBatchLimit,
    { persist: runMode === "real" }
  );
  const data = readArtistData({
    materialLimit: 80,
    materialContentLimit: 3000,
    opportunityLimit: 120,
    opportunityRawContentLimit: opportunityPromptTextLimit,
    applicationLimit: 20
  });

  const prompt = buildAutomationPrompt(data, runMode, phase);
  const ai = await callChatCompletion([
    {
      role: "system",
      content: [
        "You are an artist application automation assistant embedded in a Next.js project workspace.",
        "Return one strict JSON object only. Do not wrap it in markdown.",
        "Do not claim to have verified live deadlines, fees, or eligibility unless the provided source material contains that fact.",
        "Create applicationPackages only for opportunities already present in currentOpportunities by id and already selected by the user."
      ].join("\n")
    },
    { role: "user", content: prompt }
  ]);

  const parsed = aiAutomationResponseSchema.parse(extractJsonObject(ai.content));
  const opportunityById = new Map(data.opportunities.map((item: Opportunity) => [item.id, item]));
  const packagePaths: string[] = [];

  for (const verified of parsed.verifiedOpportunities ?? []) {
    const opportunity = typeof verified.opportunityId === "number" ? opportunityById.get(verified.opportunityId) : null;
    if (!opportunity) continue;
    const patch = verifiedOpportunityPatch(verified);
    const score = typeof patch.score === "number" ? Math.max(0, Math.min(100, Math.trunc(patch.score))) : undefined;
    if (runMode === "real") {
      upsertVerifiedOpportunity(opportunity, { ...patch, score });
    }
  }

  for (const app of parsed.applicationPackages ?? []) {
    const opportunity = typeof app.opportunityId === "number" ? opportunityById.get(app.opportunityId) : null;
    if (!opportunity) continue;
    if (!canPreparePackage(opportunity)) continue;
    const draft = {
      internalNotes: app.internalNotes,
      userReviewZh: app.userReviewZh,
      chineseReviewSummary: app.chineseReviewSummary,
      externalApplicationAnswersEn: app.externalApplicationAnswersEn,
      externalApplicationAnswersZh: app.externalApplicationAnswersZh,
      emailDraftEn: app.emailDraftEn,
      emailDraftZh: app.emailDraftZh,
      portfolioText: app.portfolioText,
      portfolioPlan: app.portfolioPlan,
      portfolioSourceAudit: app.portfolioSourceAudit,
      selectedWorksStructured: app.selectedWorksStructured,
      selectedImages: app.selectedImages,
      excludedImages: app.excludedImages,
      excludedWorksOrImages: app.excludedWorksOrImages,
      missingMetadata: app.missingMetadata,
      portfolioQualityRisks: app.portfolioQualityRisks,
      portfolioVariants: app.portfolioVariants,
      autoRepairIntent: app.autoRepairIntent,
      portfolioWebResearchReferences: app.portfolioWebResearchReferences,
      draftZh: app.draftZh ?? "",
      draftEn: app.draftEn ?? "",
      checklist: asListText(app.checklist),
      selectedWorks: asListText(app.selectedWorks),
      bioZh: app.bioZh,
      bioEn: app.bioEn,
      statementZh: app.statementZh,
      statementEn: app.statementEn,
      cvText: app.cvText
    };
    const written = writeApplicationPackage(opportunity, draft, {
      runMode,
      materialSources: data.materialSources,
      profile: data.profile,
      works: data.works
    });
    const packagePath = written.folder;
    const applicationId = runMode === "real" ? createApplication({
      opportunityId: opportunity.id,
      runMode,
      boundaryModel: "internal_notes/user_review/external_submission",
      draftZh: draft.userReviewZh || draft.draftZh,
      draftEn: draft.externalApplicationAnswersEn || draft.draftEn,
      checklist: draft.checklist,
      selectedWorks: draft.selectedWorks,
      packagePath,
      submissionLog: written.status === "package_ready_for_final_review"
        ? "Package generated for final Chinese user review. Explicit user approval is still required before submission."
        : "Package generated but blocked by key issues the automation could not resolve. User confirmation is required only for those blocking issues."
    }) : null;
    recordPackageManifest({
      applicationId,
      opportunityId: opportunity.id,
      runMode,
      packagePath,
      manifestPath: path.join(packagePath, "package-manifest.json"),
      manifestVersion: 2,
      status: written.status
    });
    if (runMode === "real") {
      updateOpportunityStatus(opportunity.id, written.status as OpportunityStatus);
    }
    packagePaths.push(packagePath);
  }

  const runStamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(generatedReportsDir, `${runStamp}-project-ai-automation.md`);
  fs.writeFileSync(reportPath, renderReport(parsed, ai.provider, ai.model, packagePaths, pageFetches, discovery, runMode), "utf8");

  return {
    provider: ai.provider,
    model: ai.model,
    phase,
    reportPath,
    packagePaths,
    discoveredOpportunities: discovery.discovered,
    data: readArtistData()
  };
}

function buildAutomationPrompt(data: ReturnType<typeof readArtistData>, runMode: AutomationRunMode, phase: ProjectAutomationOptions["phase"]) {
  return JSON.stringify({
    task: phase === "prepare-selected"
      ? "Continue the two-review workflow after the user's first review. Prepare or repair final application packages only for opportunities whose current status is selected_by_user, preparing, or quality_blocked. Do not discover new opportunities in this phase."
      : "Run professional artist application automation. Act as a professional artist portfolio editor, not a suggestion generator. Verify and rank opportunities first. Prepare application packages only for opportunities whose current status is selected_by_user, preparing, package_ready_for_final_review, or approved_for_submission.",
    runMode,
    userReviewModel: "The user reviews only two nodes: A) which opportunities to apply for, B) whether the final submission package may be submitted. Do not ask for image choice, page-by-page portfolio review, caption edits, or layout judgment. Ordinary portfolio quality problems are repaired automatically by the system. Only final submission, payment, login, captcha, legal declarations, privacy risk, unclear eligibility, unclear fees, or missing critical required material require user intervention.",
    fileBoundaryModel: {
      internalNotes: "matching logic, risk, missing information, work-selection rationale, AI judgment, open call analysis",
      userReview: "Chinese-first opportunity analysis, recommendations, risks, material summary, changes made, final checklist",
      externalSubmission: "Only formal content the institution should see; no automation traces, no internal workflow words, no placeholders"
    },
    outputSchema: {
      summaryZh: "Chinese summary for user review",
      summaryEn: "English summary",
      profileNotesZh: "Chinese profile/material notes",
      profileNotesEn: "English profile/material notes",
      opportunityResearchPlanZh: ["Chinese research/check plan; mark items requiring live verification"],
      opportunityResearchPlanEn: ["English research/check plan"],
      warnings: ["risks, missing data, or things requiring Codex/live verification"],
      verifiedOpportunities: [{
        opportunityId: "number from currentOpportunities only",
        title: "verified title from source page",
        organization: "verified organizer",
        deadline: "verified deadline with timezone if visible",
        fee: "application/participation/program fee details",
        funding: "stipend, travel, lodging, production budget, etc.",
        eligibility: "who can apply, especially China/international eligibility",
        materials: "required materials",
        submissionMethod: "email | web_form | unknown",
        summary: "bilingual-friendly concise summary",
        score: "0-100",
        risks: "unclear facts, fees, eligibility gaps, login/captcha/payment needs",
        status: "recommended | confirmed | rejected"
      }],
      applicationPackages: [{
        opportunityId: "number from currentOpportunities only",
        internalNotes: "internal-only analysis, missing information, rationale, risks, and AI decisions",
        userReviewZh: "Chinese-first final review summary for the artist",
        chineseReviewSummary: "Chinese explanation of any English formal materials",
        externalApplicationAnswersEn: "formal English answers only if required; no internal words or placeholders",
        externalApplicationAnswersZh: "formal Chinese answers only if required; no internal words or placeholders",
        emailDraftEn: "formal English email body if needed",
        emailDraftZh: "formal Chinese email body if needed",
        portfolioText: "restrained portfolio text/captions; must be based on existing portfolio sources and recorded research; no mock/draft/placeholder/unknown/N/A/TBD language",
        portfolioConstraints: "default targetPages 20, minimumPages 16, maximumPages 24 unless the opportunity explicitly overrides page count, file size, single/combined PDF, or image upload constraints",
        portfolioSourceAudit: {
          existingPortfolioSources: ["existing user portfolio files inspected before generation"],
          availableWorks: ["works from data.works with title/year/medium/dimensions/imagePath"],
          availableImageFiles: ["formal image files under artist-assets/works, source-materials, or inbox"],
          missingMetadata: ["caption-critical missing facts; do not write unknown/N/A externally"],
          lowConfidenceFacts: ["facts that need internal review"],
          opportunitySpecificConstraints: "page count, image count, file size, language, CV/bio/statement, single-PDF requirements",
          materialsActuallyUsed: ["portfolio/work/source files actually used"]
        },
        portfolioPlan: {
          artistName: "artist name",
          portfolioTitle: "Selected Works",
          year: "current portfolio year",
          language: "en | zh",
          layoutResearchUsed: {
            referenceCount: "number of live portfolio layout references recorded before planning",
            researchFile: "internal-notes/portfolio-layout-research.md",
            derivedPrinciples: ["layout principles derived from research"],
            appliedPrinciples: ["how principles changed this PortfolioPlan"]
          },
          curatorialSummary: {
            projectGroupCount: "number",
            dominantProjectGroup: "project group with highest page share",
            dominantProjectPageRatio: "0-1",
            layoutStrategyCounts: "record of layout strategy counts",
            workTypeCounts: "record of painting / installation / research / documentation / series counts",
            passedDiversityGate: "boolean"
          },
          portfolioConstraints: {
            targetPages: "20 by default unless opportunity overrides",
            minimumPages: "16 by default unless opportunity overrides",
            maximumPages: "24 by default unless opportunity overrides",
            source: "opportunity | default",
            reason: "why these constraints apply"
          },
          maxPages: "number if constrained by opportunity",
          targetFileSizeMb: "number if constrained by opportunity",
          pages: [
            { type: "cover", title: "Artist Name", subtitle: "Selected Works", year: "2026", contact: "email / website only if available", layoutStrategy: "cover", pageRole: "cover", layoutReferenceReason: "research-informed restrained cover" },
            { type: "short_statement", text: "120-180 concrete words only when appropriate", layoutStrategy: "statement", pageRole: "statement" },
            { type: "project_opener", title: "Project / Series Title", projectGroup: "Project / Series Title", layoutStrategy: "project_opener", pageRole: "project_opener", curatorialReason: "why this section opens here" },
            { type: "series_overview_grid", workId: "id", title: "Series title", projectGroup: "Project / Series Title", layoutStrategy: "series_overview_grid", pageRole: "overview", images: [{ role: "overview", path: "absolute path" }], caption: "Short formal caption." },
            { type: "single_work_full_page", workId: "id", title: "Title", year: "Year", medium: "Medium", dimensions: "Dimensions", projectGroup: "Project / Series Title", layoutStrategy: "single_work_full_page", pageRole: "primary_work", imageRole: "primary", imagePath: "absolute path", caption: "Title, year, medium, dimensions." },
            { type: "installation_with_details", workId: "id", title: "Title", projectGroup: "Project / Series Title", layoutStrategy: "installation_with_details", pageRole: "installation", images: [{ role: "installation_view", path: "absolute path" }, { role: "detail", path: "absolute path" }], caption: "Short formal caption." },
            { type: "text_image_context", workId: "id", title: "Title", projectGroup: "Project / Series Title", layoutStrategy: "text_image_context", pageRole: "context", images: [{ role: "context", path: "absolute path" }], text: "brief project context", caption: "Short formal caption." }
          ],
          excludedImages: [{ path: "absolute path", reason: "low quality / process only / storage photo / metadata missing" }],
          qualityRisks: ["risks that should block or warn internally"]
        },
        selectedWorksStructured: [{ workId: "id", title: "Title", imagePath: "absolute path", role: "primary", reason: "why selected" }],
        selectedImages: [{ workId: "id", title: "Title", path: "absolute path", role: "primary | overview | detail | installation | context", imageQualityScore: "0-100", reason: "why selected and how it should be used" }],
        excludedImages: [{ workId: "id", title: "Title", path: "absolute path", role: "weak_candidate | excluded", reason: "weak image / duplicate / process-only / storage photo / unsuitable for external submission" }],
        excludedWorksOrImages: [{ id: "id", path: "absolute path", reason: "why excluded" }],
        missingMetadata: ["formal caption fields missing"],
        portfolioQualityRisks: ["image quality, metadata, page/file constraints, or source confidence risks"],
        portfolioVariants: ["default external portfolio.pdf plus internal editable HTML; short PDFs, images-for-upload, or combined PDF when opportunity requires"],
        autoRepairIntent: "The AI must expect the system to auto-repair ordinary page count, caption, image size, grid density, forbidden term, and file size problems for up to 3 rounds before blocking.",
        portfolioWebResearchReferences: ["URLs or source names used for portfolio structure/design conventions"],
        draftZh: "legacy Chinese review fallback",
        draftEn: "legacy English formal fallback",
        checklist: ["required files, missing fields, approval checks"],
        selectedWorks: ["work title and image path if available"],
        bioZh: "optional Chinese bio",
        bioEn: "optional English bio",
        statementZh: "optional Chinese statement",
        statementEn: "optional English statement",
        cvText: "optional CV text"
      }]
    },
    portfolioAutomationRules: [
      "Before creating any portfolioPlan, perform online portfolio layout research. Study real artist portfolio PDFs, residency application portfolios, MFA fine art portfolios, gallery PDFs, and installation documentation layouts. Record references and derived layout principles in internal-notes. Do not copy any specific design. Use the research only to improve structure, rhythm, image/text ratio, caption placement, project grouping, and documentation strategy. The final PortfolioPlan must show how the research influenced the layout choices.",
      "When no special portfolio page limit is stated, plan a mature 20-page-ish portfolio: cover, 120-180 word statement, strongest project pages, main selected works, secondary/context pages, selected works/contact page.",
      "Do not interpret 20 pages as 20 similar images. Default Selected Works must cover multiple project groups when material exists.",
      "Use at least three project groups by default, and do not let any one project group exceed 35% of pages unless the opportunity explicitly requests that series.",
      "Use varied layout strategies: project_opener, series_overview_grid, single_work_full_page, single_work_with_detail, two_image_spread, installation_overview, installation_with_details, image_research_grid, text_image_context, selected_works_list, contact_page.",
      "More than four consecutive single_work_full_page pages is a failure. A cover + statement + image/image/image template is a failure.",
      "If the title is Selected Works, it must be cross-project selected works. If only one series exists, title the portfolio with that series and record the limitation internally.",
      "Automatically choose images, order works, write captions, write the statement, assign page layouts, and avoid asking the user to judge portfolio pages.",
      "Final portfolio should look like a mature artist-prepared PDF, not a test sheet, mock review committee packet, or commercial brochure.",
      "External portfolio files must not contain mock, draft, placeholder, unknown, N/A, TBD, generated-by-AI, or dimensions recorded in source material."
    ],
    rules: buildPromptRules(data.profile),
    packagePreparationGate: phase === "prepare-selected"
      ? "The user's first review has already happened. Create applicationPackages for selected_by_user/preparing/quality_blocked opportunities and repair ordinary quality issues automatically. Do not ask the user for intermediate image choice, caption edits, or page-by-page portfolio review."
      : "Do not create applicationPackages for new/recommended/confirmed opportunities. First produce verifiedOpportunities with recommended status and Chinese rationale; wait for selected_by_user status before preparing packages.",
    portfolioReferenceResearchUsedInThisImplementation: [
      "ExhibitFolio: portfolio PDFs commonly include bio, statement, and artwork tearsheets for gallery/residency uses.",
      "Artists Collecting Society portfolio guide: application PDF portfolios should prioritize images and concise captions with title, date, size, medium.",
      "Carnegie Mellon MFA guidance: upload systems may impose media/PDF file size limits; check file types and sizes.",
      "Rate My Artist Residency guidance: residency statements should say what the artist makes, why, and why this program specifically fits the next phase."
    ],
    profile: data.profile,
    works: data.works,
    cv: data.cv,
    materialSources: data.materialSources.map((source) => ({
      id: source.id,
      kind: source.kind,
      title: source.title,
      fileName: source.fileName,
      filePath: source.filePath,
      mimeType: source.mimeType,
      contentExcerpt: source.content,
      structuredAnalysisExcerpt: source.analysis
    })),
    currentOpportunities: data.opportunities
  }, null, 2);
}

function emptyDiscovery(runMode: AutomationRunMode): DiscoverySummary {
  return { sourceUrls: [], results: [], discovered: [], runMode };
}

function markSelectedOpportunitiesPreparing(opportunities: Opportunity[]) {
  for (const opportunity of opportunities) {
    if (opportunity.status === "selected_by_user" || opportunity.status === "quality_blocked") {
      updateOpportunityStatus(opportunity.id, "preparing");
    }
  }
}

function upsertVerifiedOpportunity(
  opportunity: Opportunity,
  patch: Omit<NonNullable<AiAutomationResponse["verifiedOpportunities"]>[number], "opportunityId">
) {
  upsertOpportunity({
    ...opportunity,
    ...withoutUndefined(patch),
    url: opportunity.url,
    source: opportunity.source || "project-ai-verified"
  });
}

function verifiedOpportunityPatch(verified: NonNullable<AiAutomationResponse["verifiedOpportunities"]>[number]) {
  return {
    title: verified.title,
    organization: verified.organization,
    deadline: verified.deadline,
    location: verified.location,
    fee: verified.fee,
    funding: verified.funding,
    eligibility: verified.eligibility,
    materials: verified.materials,
    submissionMethod: verified.submissionMethod,
    summary: verified.summary,
    score: verified.score,
    risks: verified.risks,
    status: verified.status
  };
}

function canPreparePackage(opportunity: Opportunity) {
  return ["selected_by_user", "preparing", "quality_blocked", "package_ready_for_final_review", "approved_for_submission"].includes(opportunity.status);
}

function withoutUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>;
}

function readPositiveInt(name: string, fallback: number) {
  const value = Number(process.env[name] || "");
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function readRunMode(): AutomationRunMode {
  const value = (process.env.ARTIST_STUDIO_RUN_MODE || "real").toLowerCase();
  return value === "test" || value === "mock" ? value : "real";
}

function renderReport(
  parsed: AiAutomationResponse,
  provider: string,
  model: string,
  packagePaths: string[],
  pageFetches: Awaited<ReturnType<typeof refreshOpportunityPages>>,
  discovery: Awaited<ReturnType<typeof discoverOpportunityCandidates>>,
  runMode: AutomationRunMode
) {
  return [
    "# Project AI Automation Run",
    "",
    `Provider: ${provider}`,
    `Model: ${model}`,
    `Run mode: ${runMode}`,
    `Generated at: ${new Date().toISOString()}`,
    "",
    "## 中文摘要",
    parsed.summaryZh ?? "",
    "",
    "## English Summary",
    parsed.summaryEn ?? "",
    "",
    "## 资料备注",
    parsed.profileNotesZh ?? "",
    "",
    "## Profile Notes",
    parsed.profileNotesEn ?? "",
    "",
    "## 机会核验计划",
    asListText(parsed.opportunityResearchPlanZh),
    "",
    "## Opportunity Verification Plan",
    asListText(parsed.opportunityResearchPlanEn),
    "",
    "## Warnings",
    asListText(parsed.warnings),
    "",
    "## Fetched Opportunity Pages",
    pageFetches.length
      ? pageFetches.map((item) => `- ${item.ok ? "OK" : "FAILED"} ${item.url}${item.error ? ` (${item.error})` : ""}`).join("\n")
      : "No user-provided opportunity pages fetched in this run.",
    "",
    "## Global Opportunity Discovery",
    discovery.discovered.length
      ? discovery.discovered.map((item) => `- ${item.title}: ${item.url} (source: ${item.sourceUrl})`).join("\n")
      : "No opportunity links discovered from configured public sources in this run.",
    "",
    "## Discovery Sources",
    discovery.results.map((item) => `- ${item.ok ? "OK" : "FAILED"} ${item.sourceUrl}${item.error ? ` (${item.error})` : ""}: ${item.discovered.length} links`).join("\n"),
    "",
    "## Verified Opportunities",
    asListText(parsed.verifiedOpportunities),
    "",
    "## Generated Packages",
    packagePaths.length ? packagePaths.map((item) => `- ${item}`).join("\n") : "No application packages generated in this run."
  ].join("\n");
}
