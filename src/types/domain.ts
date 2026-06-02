export type OpportunityStatus =
  | "new"
  | "recommended"
  | "selected_by_user"
  | "not_selected"
  | "confirmed"
  | "preparing"
  | "quality_blocked"
  | "package_ready_for_final_review"
  | "approved_for_submission"
  | "ready_to_submit"
  | "submitted"
  | "waiting"
  | "shortlisted"
  | "rejected";

export type SubmissionMethod = "email" | "web_form" | "unknown";
export type SubmissionApprovalMode = "review_required" | "review_optional" | "direct_apply";
export type OpportunityFeePreference = "conservative" | "application_fee_ok" | "paid_ok";
export type OpportunityTierPreference = "high_tier" | "balanced" | "open";
export type AutomationRunMode = "real" | "test" | "mock";

export type ArtistProfile = {
  id: number;
  name: string;
  nameZh: string;
  nameEn: string;
  email: string;
  location: string;
  locationZh: string;
  locationEn: string;
  website: string;
  instagram: string;
  bioZhShort: string;
  bioZhMedium: string;
  bioZhLong: string;
  bioEnShort: string;
  bioEnMedium: string;
  bioEnLong: string;
  statementZh: string;
  statementEn: string;
  preferences: string;
  preferencesZh: string;
  preferencesEn: string;
  applicationRegion: string;
  automationBatchLimit: number;
  submissionApprovalMode: SubmissionApprovalMode;
  opportunityFeePreference: OpportunityFeePreference;
  opportunityTierPreference: OpportunityTierPreference;
  updatedAt: string;
};

export type Work = {
  id: number;
  title: string;
  titleZh: string;
  titleEn: string;
  year: string;
  medium: string;
  mediumZh: string;
  mediumEn: string;
  dimensions: string;
  dimensionsZh: string;
  dimensionsEn: string;
  imagePath: string;
  descriptionZh: string;
  descriptionEn: string;
};

export type PortfolioImageRole =
  | "primary"
  | "overview"
  | "detail"
  | "installation"
  | "installation_view"
  | "process"
  | "context"
  | "archive_reference"
  | "reverse"
  | "reference"
  | "weak_candidate"
  | "excluded";

export type PortfolioConstraints = {
  targetPages: number;
  minimumPages: number;
  maximumPages: number;
  source: "opportunity" | "default";
  reason: string;
  maxPages?: number;
  targetFileSizeMb?: number;
  imageCountRange?: {
    minimum?: number;
    maximum?: number;
  };
  requiresSinglePdf?: boolean;
  requiresCombinedPdf?: boolean;
};

export type PortfolioPlanImage = {
  role: PortfolioImageRole;
  path: string;
  caption?: string;
  imageQualityScore?: number;
  qualityRisks?: string[];
};

export type PortfolioPageRole = "cover" | "statement" | "project_opener" | "overview" | "primary_work" | "detail" | "installation" | "context" | "list" | "contact";

export type PortfolioPageMetadata = {
  projectGroup?: string;
  projectTitle?: string;
  layoutStrategy?: string;
  pageRole?: PortfolioPageRole;
  curatorialReason?: string;
  layoutReferenceReason?: string;
};

export type PortfolioPlanPage =
  | {
      type: "cover";
      title: string;
      subtitle?: string;
      year?: string;
      contact?: string;
    } & PortfolioPageMetadata
  | {
      type: "short_statement";
      text: string;
    } & PortfolioPageMetadata
  | {
      type: "project_opener";
      title: string;
      text?: string;
    } & PortfolioPageMetadata
  | {
      type: "work_full_page" | "single_work_full_page";
      workId?: string;
      title: string;
      year?: string;
      medium?: string;
      dimensions?: string;
      imageRole?: PortfolioImageRole;
      imagePath: string;
      caption?: string;
      note?: string;
    } & PortfolioPageMetadata
  | {
      type:
        | "work_with_details"
        | "single_work_with_detail"
        | "installation_spread"
        | "installation_overview"
        | "installation_with_details"
        | "series_grid"
        | "series_overview_grid"
        | "image_research_grid"
        | "image_with_caption_below"
        | "two_image_detail_spread"
        | "two_image_spread"
        | "series_grid_large"
        | "text_left_image_right"
        | "text_image_context";
      workId?: string;
      title: string;
      year?: string;
      medium?: string;
      dimensions?: string;
      layout?: "overview_plus_details" | "grid" | "spread" | "single" | "detail_spread" | "large_grid" | "text_image";
      images: PortfolioPlanImage[];
      text?: string;
      caption?: string;
      note?: string;
    } & PortfolioPageMetadata
  | {
      type: "contact" | "contact_page" | "selected_works_list";
      title?: string;
      text?: string;
      works?: string[];
    } & PortfolioPageMetadata;

export type PortfolioSourceAudit = {
  existingPortfolioSources: string[];
  availableWorks: Array<{
    id: number | string;
    title: string;
    year?: string;
    medium?: string;
    dimensions?: string;
    imagePath?: string;
  }>;
  availableImageFiles: string[];
  missingMetadata: string[];
  lowConfidenceFacts: string[];
  opportunitySpecificConstraints: {
    maxPages?: number;
    minPages?: number;
    targetPages?: number;
    targetFileSizeMb?: number;
    language?: string;
    requiresCv?: boolean;
    requiresBio?: boolean;
    requiresStatement?: boolean;
    requiresSinglePdf?: boolean;
    rawMaterialsText?: string;
  };
  portfolioConstraints?: PortfolioConstraints;
  materialsActuallyUsed: string[];
};

export type PortfolioPlan = {
  artistName: string;
  portfolioTitle: string;
  year: string;
  language: string;
  portfolioConstraints: PortfolioConstraints;
  maxPages?: number;
  targetFileSizeMb?: number;
  pages: PortfolioPlanPage[];
  excludedImages: Array<{
    path: string;
    reason: string;
  }>;
  qualityRisks: string[];
  curatorialSummary: {
    projectGroupCount: number;
    dominantProjectGroup?: string;
    dominantProjectPageRatio?: number;
    layoutStrategyCounts: Record<string, number>;
    workTypeCounts: Record<string, number>;
    passedDiversityGate: boolean;
  };
  layoutResearchUsed: {
    referenceCount: number;
    researchFile: string;
    derivedPrinciples: string[];
    appliedPrinciples: string[];
  };
};

export type PortfolioLayoutResearch = {
  searchedAt: string;
  queriesUsed: string[];
  references: Array<{
    title: string;
    url: string;
    sourceType: "artist portfolio" | "school guidance" | "gallery PDF" | "residency guidance" | "MFA example" | "design article";
    relevantFor: string[];
    layoutObservations: string[];
    doNotCopyWarning: boolean;
  }>;
  derivedLayoutPrinciples: string[];
  portfolioStrategyForThisArtist: string[];
  appliedPrinciples?: string[];
  liveWebResearchUnavailable?: boolean;
  riskNotes?: string[];
};

export type PortfolioIssueSeverity = "auto_fixable" | "blocking" | "warning";

export type PortfolioIssueClassification = {
  code: string;
  message: string;
  severity: PortfolioIssueSeverity;
  page?: number;
  sourcePath?: string;
};

export type PortfolioVisualGateResult = {
  checkedAt: string;
  method: string;
  opportunityTitle: string;
  passed: boolean;
  pageCount: number;
  targetPages: number;
  minimumPages: number;
  maximumPages: number;
  pdfPath: string | null;
  pdfSizeBytes: number;
  autoFixableIssues: PortfolioIssueClassification[];
  blockingIssues: PortfolioIssueClassification[];
  warnings: PortfolioIssueClassification[];
  suggestedRepairs: string[];
  copiedImages: Array<{
    sourcePath: string;
    targetFileName: string;
    width: number;
    height: number;
    format: string;
    sizeBytes: number;
    optimized: boolean;
    tooSmallForFullPage: boolean;
  }>;
  domCheck: {
    pageCount: number;
    issues: string[];
  };
};

export type PortfolioAutoRepairRound = {
  round: number;
  issues: PortfolioIssueClassification[];
  repairsApplied: string[];
  pageCountBefore: number;
  pageCountAfter: number;
};

export type PortfolioAutoRepairLog = {
  startedAt: string;
  maxRounds: number;
  rounds: PortfolioAutoRepairRound[];
  finalStatus: "passed" | "blocked";
  remainingBlockingIssues: PortfolioIssueClassification[];
  warnings: PortfolioIssueClassification[];
};

export type PortfolioVariant = {
  type: "default_pdf" | "default_html" | "short_pdf" | "images_for_upload" | "combined_pdf";
  path: string;
  status: "generated" | "planned" | "blocked";
  reason?: string;
};

export type CvEntry = {
  id: number;
  category: string;
  categoryZh: string;
  categoryEn: string;
  year: string;
  title: string;
  titleZh: string;
  titleEn: string;
  organization: string;
  organizationZh: string;
  organizationEn: string;
  location: string;
  locationZh: string;
  locationEn: string;
  notes: string;
  notesZh: string;
  notesEn: string;
};

export type MaterialKind = "cv" | "bio" | "statement" | "works" | "portfolio" | "other";

export type SourceMaterial = {
  id: number;
  kind: MaterialKind;
  title: string;
  content: string;
  analysis: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
};

export type Opportunity = {
  id: number;
  title: string;
  organization: string;
  url: string;
  location: string;
  deadline: string;
  fee: string;
  funding: string;
  eligibility: string;
  materials: string;
  submissionMethod: SubmissionMethod;
  summary: string;
  score: number | null;
  risks: string;
  status: OpportunityStatus;
  source: string;
  rawContent: string;
  createdAt: string;
  updatedAt: string;
};

export type Application = {
  id: number;
  opportunityId: number;
  runMode: AutomationRunMode;
  boundaryModel: string;
  draftZh: string;
  draftEn: string;
  checklist: string;
  selectedWorks: string;
  packagePath: string;
  submissionLog: string;
  createdAt: string;
  updatedAt: string;
};

export type ActivityLog = {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  metadata: string;
  createdAt: string;
};

export type PackageManifest = {
  id: number;
  applicationId: number | null;
  opportunityId: number | null;
  runMode: AutomationRunMode;
  packagePath: string;
  manifestPath: string;
  manifestVersion: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};
