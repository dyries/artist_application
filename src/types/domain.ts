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

export type PortfolioImageRole = "primary" | "overview" | "detail" | "installation" | "process" | "context" | "reverse" | "reference";

export type PortfolioPlanImage = {
  role: PortfolioImageRole;
  path: string;
  caption?: string;
};

export type PortfolioPlanPage =
  | {
      type: "cover";
      title: string;
      subtitle?: string;
      year?: string;
      contact?: string;
    }
  | {
      type: "short_statement";
      text: string;
    }
  | {
      type: "work_full_page";
      workId?: string;
      title: string;
      year?: string;
      medium?: string;
      dimensions?: string;
      imageRole?: PortfolioImageRole;
      imagePath: string;
      caption?: string;
      note?: string;
    }
  | {
      type: "work_with_details" | "installation_spread" | "series_grid";
      workId?: string;
      title: string;
      year?: string;
      medium?: string;
      dimensions?: string;
      layout?: "overview_plus_details" | "grid" | "spread";
      images: PortfolioPlanImage[];
      caption?: string;
      note?: string;
    }
  | {
      type: "contact" | "selected_works_list";
      title?: string;
      text?: string;
      works?: string[];
    };

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
    targetFileSizeMb?: number;
    language?: string;
    requiresCv?: boolean;
    requiresBio?: boolean;
    requiresStatement?: boolean;
    requiresSinglePdf?: boolean;
    rawMaterialsText?: string;
  };
  materialsActuallyUsed: string[];
};

export type PortfolioPlan = {
  artistName: string;
  portfolioTitle: string;
  year: string;
  language: string;
  maxPages?: number;
  targetFileSizeMb?: number;
  pages: PortfolioPlanPage[];
  excludedImages: Array<{
    path: string;
    reason: string;
  }>;
  qualityRisks: string[];
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
