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
  | "complete_work_image"
  | "primary_documentation"
  | "overview"
  | "detail"
  | "installation"
  | "installation_view"
  | "process"
  | "context"
  | "archive_reference"
  | "reverse"
  | "reference"
  | "temporary"
  | "cropped"
  | "partial"
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
  requiresImageUploadOnly?: boolean;
};

export type PortfolioPlanImage = {
  role: PortfolioImageRole;
  path: string;
  caption?: string;
  imageQualityScore?: number;
  qualityRisks?: string[];
};

export type PortfolioImageAnalysis = {
  path: string;
  width: number;
  height: number;
  aspectRatio: number;
  orientation: "portrait" | "landscape" | "square" | "panorama";
  fileSizeBytes: number;
  format: string;
  dominantColors: string[];
  palette?: string[];
  averageBrightness: number;
  brightnessLabel?: "dark" | "balanced" | "bright";
  tooSmallForFullPage: boolean;
  fullPageSuitability?: "strong" | "usable" | "detail_only" | "exclude";
  qualityRisks: string[];
  recommendedRoles: PortfolioImageRole[];
  assignedRole?: PortfolioImageRole;
  recommendedRole?: PortfolioImageRole;
  completeWorkScore?: number;
  primaryCandidate?: boolean;
  cropRisk?: boolean;
  partialImageRisk?: boolean;
  temporaryPhotoRisk?: boolean;
  supportOnly?: boolean;
  rejectionReason?: string;
  selectionReason?: string;
};

export type PortfolioPageRole = "cover" | "statement" | "project_opener" | "overview" | "primary_work" | "detail" | "installation" | "context" | "list" | "contact";

export type PortfolioThemeName =
  | "quiet_white"
  | "warm_archive"
  | "soft_gray_gallery"
  | "dark_installation"
  | "image_research_bluegray"
  | "painting_color_field";

export type PortfolioTheme = {
  name: PortfolioThemeName;
  background: string;
  text: string;
  secondaryText: string;
  accent: string;
  captionBackground?: string;
  imageFrame?: "none" | "hairline" | "soft_shadow" | "inset_panel";
};

export type PortfolioPageDesign = {
  themeName: PortfolioThemeName;
  backgroundMode: "plain" | "accent_panel" | "split_field" | "image_bleed" | "soft_block";
  emphasis: "image" | "text" | "balanced" | "section";
  pageNumber?: boolean;
};

export type PortfolioDesignSystem = {
  themeName: PortfolioThemeName;
  theme: PortfolioTheme;
  headingScale: "quiet" | "sectional" | "large_cover";
  pageNumberStyle: "bottom_right" | "outer_margin" | "none";
  marginSystem: "gallery" | "archive" | "installation";
  sectionDividerStyle?: "rule" | "accent_block" | "none";
};

export type PortfolioPageMetadata = {
  projectGroup?: string;
  projectTitle?: string;
  layoutStrategy?: string;
  pageRole?: PortfolioPageRole;
  design?: PortfolioPageDesign;
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
  imageAnalyses?: PortfolioImageAnalysis[];
  allAvailableImages?: Array<PortfolioAuditedImage>;
  selectedImages?: Array<PortfolioAuditedImage & { page?: number; pageType?: string; use?: "primary" | "overview" | "supporting" | "context" }>;
  excludedImages?: Array<PortfolioAuditedImage>;
  projectGroupPrimaryImages?: Array<{
    projectGroup: string;
    primaryImagePath?: string;
    completeImageAvailable: boolean;
    qualityBlocked?: boolean;
    reason?: string;
  }>;
  supportOnlyImages?: Array<{
    path: string;
    projectGroup?: string;
    assignedRole?: PortfolioImageRole;
    reason: string;
  }>;
};

export type PortfolioAuditedImage = {
  path: string;
  projectGroup?: string;
  title?: string;
  dimensions?: string;
  width?: number;
  height?: number;
  assignedRole?: PortfolioImageRole;
  recommendedRole?: PortfolioImageRole;
  completeWorkScore?: number;
  qualityScore?: number;
  risks?: string[];
  selectedReason?: string;
  excludedReason?: string;
  supportOnly?: boolean;
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
  designSystem?: PortfolioDesignSystem;
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
    fetched?: boolean;
    screenshotPath?: string;
    extractedTextExcerpt?: string;
    relevantFor: string[];
    layoutObservations: string[];
    doNotCopyWarning: boolean;
  }>;
  derivedLayoutPrinciples: string[];
  executablePatterns?: {
    recommendedPageRhythm: string[];
    imageTextRatioRules: string[];
    captionPlacementRules: string[];
    projectSectionPatterns: string[];
    installationDocumentationPattern: string[];
    seriesGridPattern: string[];
    colorAndBackgroundGuidance: string[];
  };
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
  pageScreenshots: string[];
  layoutStrategyCounts: Record<string, number>;
  themeCounts: Record<string, number>;
  repeatedLayoutRuns: Array<{ strategy: string; startPage: number; length: number }>;
  blankOrSparsePages: number[];
  whiteOnlyPageRatio: number;
  webPreviewLanguageHits: string[];
  missingImages: string[];
  smallImagePages: number[];
  captionIssues: Array<{ page: number; issue: string }>;
  aestheticScore: number;
  professionalPdfScore: number;
  usedFallbackPdf?: boolean;
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
  mandatoryImageSelectionIssues?: Array<{
    code: string;
    message: string;
  }>;
  aestheticDiagnostics: {
    whiteOnlyPageCount: number;
    layoutStrategyCount: number;
    longestLayoutRun: number;
    pagesWithLikelySmallImages: number;
    pagesWithDenseCaptions: number;
    forbiddenExternalWords: string[];
    readsAsHtmlPreview: boolean;
  };
  domCheck: {
    pageCount: number;
    issues: Array<{
      code: string;
      message: string;
      page?: number;
    }>;
    pages: Array<{
      page: number;
      layout: string;
      contentOccupancy: number;
      imageOccupancy: number;
      overflowPixels: number;
      distortedImageCount: number;
      largestTextPx: number;
      captionTextPx: number;
      structuralSignature: string;
    }>;
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
