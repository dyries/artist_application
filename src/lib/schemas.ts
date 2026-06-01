import { z } from "zod";

const listTextSchema = z.union([z.string(), z.array(z.string())]).optional();
const opportunityStatusSchema = z.enum([
  "new",
  "recommended",
  "selected_by_user",
  "not_selected",
  "confirmed",
  "preparing",
  "quality_blocked",
  "package_ready_for_final_review",
  "approved_for_submission",
  "ready_to_submit",
  "submitted",
  "waiting",
  "shortlisted",
  "rejected"
]);

const portfolioImageRoleSchema = z.enum(["primary", "overview", "detail", "installation", "process", "context", "reverse", "reference"]);

const portfolioPlanImageSchema = z.object({
  role: portfolioImageRoleSchema.default("primary"),
  path: z.string().default(""),
  caption: z.string().optional()
}).strict();

export const portfolioPlanSchema = z.object({
  artistName: z.string().default(""),
  portfolioTitle: z.string().default("Selected Works"),
  year: z.string().default(""),
  language: z.string().default("en"),
  maxPages: z.number().int().positive().optional(),
  targetFileSizeMb: z.number().positive().optional(),
  pages: z.array(z.discriminatedUnion("type", [
    z.object({
      type: z.literal("cover"),
      title: z.string().default(""),
      subtitle: z.string().optional(),
      year: z.string().optional(),
      contact: z.string().optional()
    }).strict(),
    z.object({
      type: z.literal("short_statement"),
      text: z.string().default("")
    }).strict(),
    z.object({
      type: z.literal("work_full_page"),
      workId: z.string().optional(),
      title: z.string().default(""),
      year: z.string().optional(),
      medium: z.string().optional(),
      dimensions: z.string().optional(),
      imageRole: portfolioImageRoleSchema.optional(),
      imagePath: z.string().default(""),
      caption: z.string().optional(),
      note: z.string().optional()
    }).strict(),
    z.object({
      type: z.enum(["work_with_details", "installation_spread", "series_grid"]),
      workId: z.string().optional(),
      title: z.string().default(""),
      year: z.string().optional(),
      medium: z.string().optional(),
      dimensions: z.string().optional(),
      layout: z.enum(["overview_plus_details", "grid", "spread"]).optional(),
      images: z.array(portfolioPlanImageSchema).default([]),
      caption: z.string().optional(),
      note: z.string().optional()
    }).strict(),
    z.object({
      type: z.enum(["contact", "selected_works_list"]),
      title: z.string().optional(),
      text: z.string().optional(),
      works: z.array(z.string()).optional()
    }).strict()
  ])).default([]),
  excludedImages: z.array(z.object({
    path: z.string().default(""),
    reason: z.string().default("")
  }).strict()).default([]),
  qualityRisks: z.array(z.string()).default([])
}).strict();

const portfolioSourceAuditSchema = z.object({
  existingPortfolioSources: z.array(z.string()).default([]),
  availableWorks: z.array(z.object({
    id: z.union([z.number(), z.string()]),
    title: z.string(),
    year: z.string().optional(),
    medium: z.string().optional(),
    dimensions: z.string().optional(),
    imagePath: z.string().optional()
  }).passthrough()).default([]),
  availableImageFiles: z.array(z.string()).default([]),
  missingMetadata: z.array(z.string()).default([]),
  lowConfidenceFacts: z.array(z.string()).default([]),
  opportunitySpecificConstraints: z.object({
    maxPages: z.number().int().positive().optional(),
    targetFileSizeMb: z.number().positive().optional(),
    language: z.string().optional(),
    requiresCv: z.boolean().optional(),
    requiresBio: z.boolean().optional(),
    requiresStatement: z.boolean().optional(),
    requiresSinglePdf: z.boolean().optional(),
    rawMaterialsText: z.string().optional()
  }).passthrough().default({}),
  materialsActuallyUsed: z.array(z.string()).default([])
}).strict();

export const artistPayloadSchema = z.object({
  profile: z.object({
    id: z.number().default(1),
    name: z.string().default(""),
    nameZh: z.string().default(""),
    nameEn: z.string().default(""),
    email: z.string().default(""),
    location: z.string().default(""),
    locationZh: z.string().default(""),
    locationEn: z.string().default(""),
    website: z.string().default(""),
    instagram: z.string().default(""),
    bioZhShort: z.string().default(""),
    bioZhMedium: z.string().default(""),
    bioZhLong: z.string().default(""),
    bioEnShort: z.string().default(""),
    bioEnMedium: z.string().default(""),
    bioEnLong: z.string().default(""),
    statementZh: z.string().default(""),
    statementEn: z.string().default(""),
    preferences: z.string().default(""),
    preferencesZh: z.string().default(""),
    preferencesEn: z.string().default(""),
    applicationRegion: z.string().default("worldwide"),
    automationBatchLimit: z.number().int().min(1).max(100).default(5),
    submissionApprovalMode: z.enum(["review_required", "review_optional", "direct_apply"]).default("review_required"),
    opportunityFeePreference: z.enum(["conservative", "application_fee_ok", "paid_ok"]).default("conservative"),
    opportunityTierPreference: z.enum(["high_tier", "balanced", "open"]).default("high_tier"),
    updatedAt: z.string().default("")
  }),
  works: z.array(z.object({
    id: z.number().default(0),
    title: z.string().default(""),
    titleZh: z.string().default(""),
    titleEn: z.string().default(""),
    year: z.string().default(""),
    medium: z.string().default(""),
    mediumZh: z.string().default(""),
    mediumEn: z.string().default(""),
    dimensions: z.string().default(""),
    dimensionsZh: z.string().default(""),
    dimensionsEn: z.string().default(""),
    imagePath: z.string().default(""),
    descriptionZh: z.string().default(""),
    descriptionEn: z.string().default("")
  })).default([]),
  cv: z.array(z.object({
    id: z.number().default(0),
    category: z.string().default("exhibition"),
    categoryZh: z.string().default(""),
    categoryEn: z.string().default(""),
    year: z.string().default(""),
    title: z.string().default(""),
    titleZh: z.string().default(""),
    titleEn: z.string().default(""),
    organization: z.string().default(""),
    organizationZh: z.string().default(""),
    organizationEn: z.string().default(""),
    location: z.string().default(""),
    locationZh: z.string().default(""),
    locationEn: z.string().default(""),
    notes: z.string().default(""),
    notesZh: z.string().default(""),
    notesEn: z.string().default("")
  })).default([]),
  materialSources: z.array(z.object({
    id: z.number().default(0),
    kind: z.enum(["cv", "bio", "statement", "works", "portfolio", "other"]).default("other"),
    title: z.string().default(""),
    content: z.string().default(""),
    analysis: z.string().default(""),
    fileName: z.string().default(""),
    filePath: z.string().default(""),
    mimeType: z.string().default("")
  })).default([])
});

export const aiAutomationResponseSchema = z.object({
  summaryZh: z.string().optional(),
  summaryEn: z.string().optional(),
  profileNotesZh: z.string().optional(),
  profileNotesEn: z.string().optional(),
  verifiedOpportunities: z.array(z.object({
    opportunityId: z.number().int().positive().optional(),
    title: z.string().optional(),
    organization: z.string().optional(),
    deadline: z.string().optional(),
    location: z.string().optional(),
    fee: z.string().optional(),
    funding: z.string().optional(),
    eligibility: z.string().optional(),
    materials: z.string().optional(),
    submissionMethod: z.enum(["email", "web_form", "unknown"]).optional(),
    summary: z.string().optional(),
    score: z.number().finite().optional(),
    risks: z.string().optional(),
    status: opportunityStatusSchema.optional()
  }).strict()).default([]),
  opportunityResearchPlanZh: z.array(z.string()).default([]),
  opportunityResearchPlanEn: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  applicationPackages: z.array(z.object({
    opportunityId: z.number().int().positive().optional(),
    internalNotes: z.string().optional(),
    userReviewZh: z.string().optional(),
    chineseReviewSummary: z.string().optional(),
    externalApplicationAnswersEn: z.string().optional(),
    externalApplicationAnswersZh: z.string().optional(),
    emailDraftEn: z.string().optional(),
    emailDraftZh: z.string().optional(),
    portfolioText: z.string().optional(),
    portfolioPlan: portfolioPlanSchema.optional(),
    portfolioSourceAudit: portfolioSourceAuditSchema.optional(),
    selectedWorksStructured: z.array(z.object({
      workId: z.union([z.number(), z.string()]).optional(),
      title: z.string().default(""),
      imagePath: z.string().optional(),
      role: portfolioImageRoleSchema.optional(),
      reason: z.string().optional()
    }).strict()).default([]),
    excludedWorksOrImages: z.array(z.object({
      id: z.union([z.number(), z.string()]).optional(),
      path: z.string().optional(),
      reason: z.string().default("")
    }).strict()).default([]),
    missingMetadata: z.array(z.string()).default([]),
    portfolioQualityRisks: z.array(z.string()).default([]),
    portfolioWebResearchReferences: z.array(z.string()).default([]),
    draftZh: z.string().optional(),
    draftEn: z.string().optional(),
    checklist: listTextSchema,
    selectedWorks: listTextSchema,
    bioZh: z.string().optional(),
    bioEn: z.string().optional(),
    statementZh: z.string().optional(),
    statementEn: z.string().optional(),
    cvText: z.string().optional()
  }).strict()).default([])
}).strict();

export type AiAutomationResponse = z.infer<typeof aiAutomationResponseSchema>;
