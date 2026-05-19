export type OpportunityStatus =
  | "new"
  | "confirmed"
  | "preparing"
  | "ready_to_submit"
  | "submitted"
  | "waiting"
  | "shortlisted"
  | "rejected";

export type SubmissionMethod = "email" | "web_form" | "unknown";
export type SubmissionApprovalMode = "review_required" | "review_optional" | "direct_apply";
export type OpportunityFeePreference = "conservative" | "application_fee_ok" | "paid_ok";
export type OpportunityTierPreference = "high_tier" | "balanced" | "open";

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
  packagePath: string;
  manifestPath: string;
  manifestVersion: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};
