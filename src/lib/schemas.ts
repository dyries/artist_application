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

const portfolioImageRoleSchema = z.enum([
  "primary",
  "complete_work_image",
  "primary_documentation",
  "overview",
  "detail",
  "installation",
  "installation_view",
  "process",
  "context",
  "archive_reference",
  "reverse",
  "reference",
  "temporary",
  "cropped",
  "partial",
  "weak_candidate",
  "excluded"
]);

const portfolioConstraintsSchema = z.object({
  targetPages: z.number().int().positive().default(20),
  minimumPages: z.number().int().positive().default(16),
  maximumPages: z.number().int().positive().default(24),
  source: z.enum(["opportunity", "default"]).default("default"),
  reason: z.string().default("No explicit opportunity page limit; default to a formal portfolio around 20 pages."),
  maxPages: z.number().int().positive().optional(),
  targetFileSizeMb: z.number().positive().optional(),
  imageCountRange: z.object({
    minimum: z.number().int().positive().optional(),
    maximum: z.number().int().positive().optional()
  }).optional(),
  requiresSinglePdf: z.boolean().optional(),
  requiresCombinedPdf: z.boolean().optional(),
  requiresImageUploadOnly: z.boolean().optional()
}).passthrough();

const portfolioThemeNameSchema = z.enum([
  "quiet_white",
  "warm_archive",
  "soft_gray_gallery",
  "dark_installation",
  "image_research_bluegray",
  "painting_color_field"
]);

const portfolioThemeSchema = z.object({
  name: portfolioThemeNameSchema,
  background: z.string(),
  text: z.string(),
  secondaryText: z.string(),
  accent: z.string(),
  captionBackground: z.string().optional(),
  imageFrame: z.enum(["none", "hairline", "soft_shadow", "inset_panel"]).optional()
}).strict();

const portfolioPageDesignSchema = z.object({
  themeName: portfolioThemeNameSchema,
  backgroundMode: z.enum(["plain", "accent_panel", "split_field", "image_bleed", "soft_block"]),
  emphasis: z.enum(["image", "text", "balanced", "section"]),
  pageNumber: z.boolean().optional()
}).strict();

const portfolioDesignSystemSchema = z.object({
  themeName: portfolioThemeNameSchema,
  theme: portfolioThemeSchema,
  headingScale: z.enum(["quiet", "sectional", "large_cover"]),
  pageNumberStyle: z.enum(["bottom_right", "outer_margin", "none"]),
  marginSystem: z.enum(["gallery", "archive", "installation"]),
  sectionDividerStyle: z.enum(["rule", "accent_block", "none"]).optional()
}).strict();

const portfolioPlanImageSchema = z.object({
  role: portfolioImageRoleSchema.default("primary"),
  path: z.string().default(""),
  caption: z.string().optional(),
  imageQualityScore: z.number().min(0).max(100).optional(),
  qualityRisks: z.array(z.string()).optional()
}).strict();

const portfolioImageAnalysisSchema = z.object({
  path: z.string(),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  aspectRatio: z.number().nonnegative(),
  orientation: z.enum(["portrait", "landscape", "square", "panorama"]),
  fileSizeBytes: z.number().int().nonnegative(),
  format: z.string(),
  dominantColors: z.array(z.string()).default([]),
  averageBrightness: z.number().min(0).max(1),
  tooSmallForFullPage: z.boolean(),
  qualityRisks: z.array(z.string()).default([]),
  recommendedRoles: z.array(portfolioImageRoleSchema).default([]),
  assignedRole: portfolioImageRoleSchema.optional(),
  recommendedRole: portfolioImageRoleSchema.optional(),
  completeWorkScore: z.number().min(0).max(100).optional(),
  primaryCandidate: z.boolean().optional(),
  cropRisk: z.boolean().optional(),
  partialImageRisk: z.boolean().optional(),
  temporaryPhotoRisk: z.boolean().optional(),
  supportOnly: z.boolean().optional(),
  rejectionReason: z.string().optional(),
  selectionReason: z.string().optional()
}).passthrough();

const portfolioPageMetadataSchema = z.object({
  projectGroup: z.string().optional(),
  projectTitle: z.string().optional(),
  layoutStrategy: z.string().optional(),
  pageRole: z.enum(["cover", "statement", "project_opener", "overview", "primary_work", "detail", "installation", "context", "list", "contact"]).optional(),
  design: portfolioPageDesignSchema.optional(),
  curatorialReason: z.string().optional(),
  layoutReferenceReason: z.string().optional()
});

const withPortfolioPageMetadata = <T extends z.ZodRawShape>(shape: T) => z.object(shape).merge(portfolioPageMetadataSchema).strict();

export const portfolioPlanSchema = z.object({
  artistName: z.string().default(""),
  portfolioTitle: z.string().default("Selected Works"),
  year: z.string().default(""),
  language: z.string().default("en"),
  portfolioConstraints: portfolioConstraintsSchema.default({
    targetPages: 20,
    minimumPages: 16,
    maximumPages: 24,
    source: "default",
    reason: "No explicit opportunity page limit; default to a formal portfolio around 20 pages."
  }),
  maxPages: z.number().int().positive().optional(),
  targetFileSizeMb: z.number().positive().optional(),
  pages: z.array(z.discriminatedUnion("type", [
    withPortfolioPageMetadata({
      type: z.literal("cover"),
      title: z.string().default(""),
      subtitle: z.string().optional(),
      year: z.string().optional(),
      contact: z.string().optional()
    }),
    withPortfolioPageMetadata({
      type: z.literal("short_statement"),
      text: z.string().default("")
    }),
    withPortfolioPageMetadata({
      type: z.literal("project_opener"),
      title: z.string().default(""),
      text: z.string().optional()
    }),
    withPortfolioPageMetadata({
      type: z.enum(["work_full_page", "single_work_full_page"]),
      workId: z.string().optional(),
      title: z.string().default(""),
      year: z.string().optional(),
      medium: z.string().optional(),
      dimensions: z.string().optional(),
      imageRole: portfolioImageRoleSchema.optional(),
      imagePath: z.string().default(""),
      caption: z.string().optional(),
      note: z.string().optional()
    }),
    withPortfolioPageMetadata({
      type: z.enum(["work_with_details", "single_work_with_detail", "installation_spread", "installation_overview", "installation_with_details", "series_grid", "series_overview_grid", "image_research_grid", "image_with_caption_below", "two_image_detail_spread", "two_image_spread", "series_grid_large", "text_left_image_right", "text_image_context"]),
      workId: z.string().optional(),
      title: z.string().default(""),
      year: z.string().optional(),
      medium: z.string().optional(),
      dimensions: z.string().optional(),
      layout: z.enum(["overview_plus_details", "grid", "spread", "single", "detail_spread", "large_grid", "text_image"]).optional(),
      images: z.array(portfolioPlanImageSchema).default([]),
      text: z.string().optional(),
      caption: z.string().optional(),
      note: z.string().optional()
    }),
    withPortfolioPageMetadata({
      type: z.enum(["contact", "contact_page", "selected_works_list"]),
      title: z.string().optional(),
      text: z.string().optional(),
      works: z.array(z.string()).optional()
    })
  ])).default([]),
  excludedImages: z.array(z.object({
    path: z.string().default(""),
    reason: z.string().default("")
  }).strict()).default([]),
  qualityRisks: z.array(z.string()).default([])
  ,
  curatorialSummary: z.object({
    projectGroupCount: z.number().int().nonnegative().default(0),
    dominantProjectGroup: z.string().optional(),
    dominantProjectPageRatio: z.number().optional(),
    layoutStrategyCounts: z.record(z.string(), z.number()).default({}),
    workTypeCounts: z.record(z.string(), z.number()).default({}),
    passedDiversityGate: z.boolean().default(false)
  }).default({
    projectGroupCount: 0,
    layoutStrategyCounts: {},
    workTypeCounts: {},
    passedDiversityGate: false
  }),
  designSystem: portfolioDesignSystemSchema.optional(),
  layoutResearchUsed: z.object({
    referenceCount: z.number().int().nonnegative().default(0),
    researchFile: z.string().default("internal-notes/portfolio-layout-research.md"),
    derivedPrinciples: z.array(z.string()).default([]),
    appliedPrinciples: z.array(z.string()).default([])
  }).default({
    referenceCount: 0,
    researchFile: "internal-notes/portfolio-layout-research.md",
    derivedPrinciples: [],
    appliedPrinciples: []
  })
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
    minPages: z.number().int().positive().optional(),
    targetPages: z.number().int().positive().optional(),
    targetFileSizeMb: z.number().positive().optional(),
    language: z.string().optional(),
    requiresCv: z.boolean().optional(),
    requiresBio: z.boolean().optional(),
    requiresStatement: z.boolean().optional(),
    requiresSinglePdf: z.boolean().optional(),
    rawMaterialsText: z.string().optional()
  }).passthrough().default({}),
  portfolioConstraints: portfolioConstraintsSchema.optional(),
  materialsActuallyUsed: z.array(z.string()).default([]),
  imageAnalyses: z.array(portfolioImageAnalysisSchema).optional(),
  allAvailableImages: z.array(z.object({
    path: z.string(),
    projectGroup: z.string().optional(),
    title: z.string().optional(),
    dimensions: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    assignedRole: portfolioImageRoleSchema.optional(),
    recommendedRole: portfolioImageRoleSchema.optional(),
    completeWorkScore: z.number().optional(),
    qualityScore: z.number().optional(),
    risks: z.array(z.string()).optional(),
    selectedReason: z.string().optional(),
    excludedReason: z.string().optional(),
    supportOnly: z.boolean().optional()
  }).passthrough()).optional(),
  selectedImages: z.array(z.object({
    path: z.string(),
    page: z.number().optional(),
    pageType: z.string().optional(),
    use: z.enum(["primary", "overview", "supporting", "context"]).optional()
  }).passthrough()).optional(),
  excludedImages: z.array(z.object({
    path: z.string()
  }).passthrough()).optional(),
  projectGroupPrimaryImages: z.array(z.object({
    projectGroup: z.string(),
    primaryImagePath: z.string().optional(),
    completeImageAvailable: z.boolean(),
    qualityBlocked: z.boolean().optional(),
    reason: z.string().optional()
  }).passthrough()).optional(),
  supportOnlyImages: z.array(z.object({
    path: z.string(),
    projectGroup: z.string().optional(),
    assignedRole: portfolioImageRoleSchema.optional(),
    reason: z.string()
  }).passthrough()).optional()
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
    selectedImages: z.array(z.object({
      workId: z.union([z.number(), z.string()]).optional(),
      title: z.string().optional(),
      path: z.string().default(""),
      role: portfolioImageRoleSchema.default("primary"),
      imageQualityScore: z.number().min(0).max(100).optional(),
      reason: z.string().optional()
    }).strict()).default([]),
    excludedImages: z.array(z.object({
      workId: z.union([z.number(), z.string()]).optional(),
      title: z.string().optional(),
      path: z.string().default(""),
      role: portfolioImageRoleSchema.optional(),
      reason: z.string().default("")
    }).strict()).default([]),
    excludedWorksOrImages: z.array(z.object({
      id: z.union([z.number(), z.string()]).optional(),
      path: z.string().optional(),
      reason: z.string().default("")
    }).strict()).default([]),
    missingMetadata: z.array(z.string()).default([]),
    portfolioQualityRisks: z.array(z.string()).default([]),
    portfolioVariants: z.array(z.object({
      type: z.enum(["default_pdf", "default_html", "short_pdf", "images_for_upload", "combined_pdf"]),
      path: z.string().default(""),
      status: z.enum(["generated", "planned", "blocked"]).default("planned"),
      reason: z.string().optional()
    }).strict()).default([]),
    autoRepairIntent: z.object({
      maxRounds: z.number().int().positive().default(3),
      ordinaryIssuesAreAutoFixable: z.boolean().default(true),
      blockingOnlyRequiresUser: z.boolean().default(true)
    }).passthrough().optional(),
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
