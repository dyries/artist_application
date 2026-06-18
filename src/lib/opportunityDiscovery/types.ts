import type { OpportunityFeePreference, OpportunityTierPreference } from "@/types/domain";

export type SearchLanguage = "en" | "zh" | "ja" | "ko";
export type SourceType = "curated_board" | "web_search" | "institution_site" | "rss" | "manual";
export type TriageStatus = "keep" | "reject" | "uncertain";
export type VerificationStatus = "verified" | "partially_verified" | "unverified" | "expired" | "conflicting_information";

export type ArtistSearchProfile = {
  artistName: string;
  mediums: string[];
  themes: string[];
  methods: string[];
  careerStage?: string;
  opportunityTypes: string[];
  preferredRegions: string[];
  excludedRegions: string[];
  searchLanguages: SearchLanguage[];
  eligibility: {
    nationality?: string;
    residenceCountry?: string;
    age?: number;
    studentStatus?: string;
    professionalStatus?: string;
  };
  fundingPreferences: {
    acceptsApplicationFees?: boolean;
    maxApplicationFee?: number;
    accommodationRequired?: boolean;
    travelSupportPreferred?: boolean;
    productionBudgetPreferred?: boolean;
  };
  tierPreference: OpportunityTierPreference;
  positiveKeywords: string[];
  negativeKeywords: string[];
  unknownFields: string[];
};

export type OpportunityDiscoveryLimits = {
  maxQueriesPerRun: number;
  maxResultsPerQuery: number;
  discoveryCandidateLimit: number;
  triageCandidateLimit: number;
  verificationCandidateLimit: number;
  shortlistLimit: number;
  applicationPreparationLimit: number;
};

export type SearchQuery = {
  query: string;
  language: SearchLanguage;
  region: string;
  opportunityType: string;
  priority: number;
  generatedFrom: string[];
};

export type SearchPlan = {
  profile: ArtistSearchProfile;
  limits: OpportunityDiscoveryLimits;
  sourceTypes: SourceType[];
  targetRegions: string[];
  targetLanguages: SearchLanguage[];
  targetOpportunityTypes: string[];
  institutionTypes: string[];
  queryBudgetWarnings: string[];
};

export type SearchResult = {
  title: string;
  url: string;
  snippet?: string;
  sourceName: string;
  sourceType: SourceType;
  sourceUrl?: string;
  discoveryQuery?: string;
  discoveryLanguage?: SearchLanguage;
  discoveredAt: string;
};

export type NormalizedCandidate = SearchResult & {
  canonicalUrl: string;
  normalizedUrl: string;
  normalizedTitle: string;
  contentFingerprint: string;
  officialSourceUrl?: string;
  isOfficialSource: boolean;
  duplicateGroupId: string;
};

export type DedupedCandidate = NormalizedCandidate & {
  alternateSources: NormalizedCandidate[];
};

export type TriagedCandidate = DedupedCandidate & {
  triageStatus: TriageStatus;
  triageReasons: string[];
};

export type VerifiedCandidate = TriagedCandidate & {
  officialUrl: string;
  applicationUrl?: string;
  organization: string;
  opportunityType: string;
  location: string;
  country: string;
  onlineOrOnsite: "online" | "onsite" | "hybrid" | "unknown";
  deadline: string;
  deadlineTimezone: string;
  deadlineConfidence: "high" | "medium" | "low" | "unknown";
  applicationFee: string;
  currency: string;
  eligibility: string;
  eligibleNationalities: string[];
  eligibleResidencies: string[];
  ageRequirement: string;
  studentRequirement: string;
  mediumRequirements: string[];
  requiredMaterials: string[];
  programmeDates: string;
  duration: string;
  accommodation: string;
  travelSupport: string;
  productionBudget: string;
  stipend: string;
  awardAmount: string;
  selectionProcess: string;
  sourceReliability: number;
  verificationStatus: VerificationStatus;
  verifiedAt: string;
  conflicts: string[];
};

export type OpportunityScore = {
  total: number;
  practiceFit: number;
  themeFit: number;
  mediumFit: number;
  eligibilityFit: number;
  careerStageFit: number;
  fundingFit: number;
  locationFit: number;
  deadlineFeasibility: number;
  sourceReliability: number;
  applicationEffort: number;
  strategicValue: number;
  reasons: string[];
  risks: string[];
  missingInformation: string[];
};

export type ScoredCandidate = VerifiedCandidate & {
  scoreBreakdown: OpportunityScore;
};

export type ShortlistedCandidate = ScoredCandidate & {
  recommendationReason: string;
  keyStrengths: string[];
  eligibilityRisks: string[];
  deadlineStatus: string;
  applicationEffort: string;
  fundingSummary: string;
  sourceConfidence: string;
};

export type SearchCoverageReport = {
  currentStage: "planned" | "discovering" | "normalizing" | "triaging" | "verifying" | "scoring" | "shortlisted" | "completed" | "skipped";
  generatedQueries: number;
  executedQueries: number;
  queriesByLanguage: Record<string, number>;
  queriesByRegion: Record<string, number>;
  queriesByOpportunityType: Record<string, number>;
  providersAttempted: string[];
  providersSucceeded: string[];
  providersFailed: Array<{ provider: string; reason: string }>;
  candidatesBySource: Record<string, number>;
  discoveredCount: number;
  normalizedCount: number;
  deduplicatedCount: number;
  triagedCount: number;
  triageKeepCount: number;
  triageRejectedCount: number;
  triageUncertainCount: number;
  verifiedCount: number;
  shortlistedCount: number;
  uncoveredRegions: string[];
  uncoveredOpportunityTypes: string[];
  unexecutedLanguages: string[];
  budgetTruncated: boolean;
  fixedSourceOnly: boolean;
  confidence: "high" | "medium" | "low";
  warnings: string[];
};

export type ProviderRunResult = {
  provider: string;
  ok: boolean;
  results: SearchResult[];
  error?: string;
};

export interface SearchProvider {
  name: string;
  type: SourceType;
  isAvailable(): boolean;
  unavailableReason?(): string;
  search(query: SearchQuery, plan: SearchPlan): Promise<SearchResult[]>;
}

export type DiscoveryRunResult = {
  sourceUrls: string[];
  results: ProviderRunResult[];
  discovered: ShortlistedCandidate[];
  candidatesForVerification: ScoredCandidate[];
  coverage: SearchCoverageReport;
  plan: SearchPlan;
  queries: SearchQuery[];
  runMode: string;
};

export function feePreferenceAllowsFees(value: OpportunityFeePreference) {
  return value === "application_fee_ok" || value === "paid_ok";
}
