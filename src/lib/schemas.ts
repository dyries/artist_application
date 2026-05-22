import { z } from "zod";

const listTextSchema = z.union([z.string(), z.array(z.string())]).optional();
const opportunityStatusSchema = z.enum([
  "new",
  "confirmed",
  "preparing",
  "ready_to_submit",
  "submitted",
  "waiting",
  "shortlisted",
  "rejected"
]);

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
