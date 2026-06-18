import type { ArtistProfile } from "@/types/domain";
import { readDiscoveryLimits } from "./config";
import { buildSearchProfile } from "./buildSearchProfile";
import type { SearchPlan } from "./types";

export function buildSearchPlan(profile: ArtistProfile): SearchPlan {
  const searchProfile = buildSearchProfile(profile);
  const limits = readDiscoveryLimits();
  const institutionTypes = [
    "museum",
    "foundation",
    "university",
    "art centre",
    "artist-run space",
    "biennial",
    "cultural institute",
    "arts council",
    "research centre",
    "residency programme"
  ];
  const queryBudgetWarnings = [];
  if (limits.maxQueriesPerRun < searchProfile.searchLanguages.length * 4) {
    queryBudgetWarnings.push("Search query budget is low for the configured language and region spread.");
  }
  return {
    profile: searchProfile,
    limits,
    sourceTypes: ["curated_board", "institution_site", "web_search", "rss", "manual"],
    targetRegions: searchProfile.preferredRegions,
    targetLanguages: searchProfile.searchLanguages,
    targetOpportunityTypes: searchProfile.opportunityTypes,
    institutionTypes,
    queryBudgetWarnings
  };
}
