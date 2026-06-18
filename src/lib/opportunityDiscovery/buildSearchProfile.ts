import type { ArtistProfile } from "@/types/domain";
import { feePreferenceAllowsFees, type ArtistSearchProfile, type SearchLanguage } from "./types";
import { splitTerms } from "./text";

const defaultMediums = ["painting", "installation", "interdisciplinary art", "artistic research"];
const defaultThemes = ["archives", "memory", "identity", "hidden narratives"];
const defaultMethods = ["visual research", "material practice", "site-responsive installation"];
const defaultOpportunityTypes = ["artist residency", "exhibition open call", "research fellowship", "artist grant", "commission"];
const defaultLanguages: SearchLanguage[] = ["en", "zh", "ja", "ko"];

export function buildSearchProfile(profile: ArtistProfile): ArtistSearchProfile {
  const sourceText = [
    profile.statementEn,
    profile.statementZh,
    profile.bioEnMedium,
    profile.bioZhMedium,
    profile.preferencesEn,
    profile.preferencesZh
  ].filter(Boolean).join("\n");
  const mediums = inferTerms(sourceText, [
    "painting",
    "installation",
    "interdisciplinary art",
    "new media",
    "photography",
    "sculpture",
    "moving image",
    "digital art",
    "socially engaged art",
    "artistic research",
    "绘画",
    "装置",
    "影像",
    "摄影"
  ], defaultMediums);
  const themes = inferTerms(sourceText, [
    "self-censorship",
    "censorship",
    "hidden expression",
    "coded imagery",
    "hidden narratives",
    "archives",
    "memory",
    "identity",
    "migration",
    "technology",
    "public space",
    "审查",
    "档案",
    "记忆",
    "身份"
  ], defaultThemes);
  const methods = inferTerms(sourceText, [
    "archive research",
    "field research",
    "visual research",
    "installation",
    "painting",
    "image transfer",
    "interviews",
    "site-specific",
    "material practice",
    "档案研究",
    "田野",
    "图像研究"
  ], defaultMethods);
  const preferredRegions = regionPreference(profile.applicationRegion);
  const unknownFields: string[] = [];
  if (!profile.locationEn && !profile.locationZh && !profile.location) unknownFields.push("residenceCountry");
  if (!profile.preferencesEn && !profile.preferencesZh && !profile.preferences) unknownFields.push("applicationPreferences");

  return {
    artistName: profile.nameEn || profile.nameZh || profile.name || "Artist",
    mediums,
    themes,
    methods,
    careerStage: inferCareerStage(sourceText),
    opportunityTypes: defaultOpportunityTypes,
    preferredRegions,
    excludedRegions: [],
    searchLanguages: defaultLanguages,
    eligibility: {
      nationality: undefined,
      residenceCountry: inferResidenceCountry(profile),
      professionalStatus: "artist"
    },
    fundingPreferences: {
      acceptsApplicationFees: feePreferenceAllowsFees(profile.opportunityFeePreference || "conservative"),
      maxApplicationFee: profile.opportunityFeePreference === "paid_ok" ? undefined : 75,
      accommodationRequired: true,
      travelSupportPreferred: true,
      productionBudgetPreferred: true
    },
    tierPreference: profile.opportunityTierPreference || "high_tier",
    positiveKeywords: [...mediums, ...themes, ...methods, ...splitTerms(profile.preferencesEn || profile.preferencesZh || profile.preferences)],
    negativeKeywords: negativeKeywords(profile.opportunityFeePreference || "conservative"),
    unknownFields
  };
}

function inferTerms(sourceText: string, vocabulary: string[], fallback: string[]) {
  const normalized = sourceText.toLowerCase();
  const terms = vocabulary.filter((term) => normalized.includes(term.toLowerCase()));
  return Array.from(new Set(terms.length ? terms : fallback)).slice(0, 8);
}

function inferResidenceCountry(profile: ArtistProfile) {
  const value = `${profile.locationEn} ${profile.locationZh} ${profile.location}`.toLowerCase();
  if (/china|中国|beijing|shanghai|guangzhou|shenzhen|hangzhou/.test(value)) return "China";
  return value.trim() ? profile.locationEn || profile.locationZh || profile.location : undefined;
}

function inferCareerStage(text: string) {
  if (/mfa|bfa|student|学生/i.test(text)) return "student_or_recent_graduate";
  if (/solo exhibition|museum|biennial|美术馆|双年展/i.test(text)) return "emerging_to_mid_career";
  return "emerging";
}

function regionPreference(value: string) {
  if (value === "asia") return ["Asia", "China", "Japan", "Korea"];
  if (value === "europe") return ["Europe", "UK", "Germany", "France", "Netherlands"];
  if (value === "north_america") return ["North America", "United States", "Canada"];
  if (value === "china") return ["China", "Hong Kong", "Taiwan"];
  return ["worldwide", "Asia", "Europe", "North America"];
}

function negativeKeywords(feePreference: ArtistProfile["opportunityFeePreference"]) {
  const base = ["pay-to-show", "vanity gallery", "booth fee", "wall fee", "exhibition fee"];
  if (feePreference === "paid_ok") return ["scam", "non-refundable high fee"];
  return [...base, "participation fee", "program fee", "self-funded residency"];
}
