import type { ArtistProfile, Application, CvEntry, Opportunity, SourceMaterial, Work } from "@/types/domain";

export type StudioData = {
  profile: ArtistProfile;
  works: Work[];
  cv: CvEntry[];
  materialSources: SourceMaterial[];
  opportunities: Opportunity[];
  applications: Application[];
  counts?: {
    works: number;
    cv: number;
    materialSources: number;
    opportunities: number;
    applications: number;
  };
};

export type CodexContextResult = {
  snapshotPath: string;
  instructionsPath: string;
};

export type ProjectAutomationResult = {
  provider: string;
  model: string;
  phase?: "full" | "prepare-selected";
  reportPath: string;
  packagePaths: string[];
  discoveredOpportunities?: { title: string; url: string; sourceUrl: string }[];
  data: StudioData;
};

export type OpportunityReviewResult = {
  selectedCount: number;
  automation: ProjectAutomationResult | null;
  data: StudioData;
};

export type ScanResult = {
  materials: SourceMaterial[];
  data: StudioData;
};

export type Tab = "profile" | "materials" | "works" | "cv" | "opportunities" | "submissions" | "settings";
