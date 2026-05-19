import type { ArtistProfile, CvEntry, MaterialKind, SourceMaterial, Work } from "@/types/domain";
import type { StudioData } from "./studioTypes";

export const emptyProfile: ArtistProfile = {
  id: 1,
  name: "",
  nameZh: "",
  nameEn: "",
  email: "",
  location: "",
  locationZh: "",
  locationEn: "",
  website: "",
  instagram: "",
  bioZhShort: "",
  bioZhMedium: "",
  bioZhLong: "",
  bioEnShort: "",
  bioEnMedium: "",
  bioEnLong: "",
  statementZh: "",
  statementEn: "",
  preferences: "",
  preferencesZh: "",
  preferencesEn: "",
  applicationRegion: "worldwide",
  automationBatchLimit: 5,
  submissionApprovalMode: "review_required",
  opportunityFeePreference: "conservative",
  opportunityTierPreference: "high_tier",
  updatedAt: ""
};

export const emptyWork: Work = {
  id: 0,
  title: "",
  titleZh: "",
  titleEn: "",
  year: "",
  medium: "",
  mediumZh: "",
  mediumEn: "",
  dimensions: "",
  dimensionsZh: "",
  dimensionsEn: "",
  imagePath: "",
  descriptionZh: "",
  descriptionEn: ""
};

export const emptyCvEntry: CvEntry = {
  id: 0,
  category: "exhibition",
  categoryZh: "",
  categoryEn: "exhibition",
  year: "",
  title: "",
  titleZh: "",
  titleEn: "",
  organization: "",
  organizationZh: "",
  organizationEn: "",
  location: "",
  locationZh: "",
  locationEn: "",
  notes: "",
  notesZh: "",
  notesEn: ""
};

export const initialData: StudioData = {
  profile: emptyProfile,
  works: [],
  cv: [],
  materialSources: [],
  opportunities: [],
  applications: [],
  counts: undefined
};

export const materialKindMeta: { kind: MaterialKind; label: string; hint: string }[] = [
  { kind: "cv", label: "CV", hint: "展览、教育、奖项、驻留、出版、收藏等履历材料。" },
  { kind: "portfolio", label: "作品集", hint: "完整 portfolio、作品页、作品序列和旧申请合集。" },
  { kind: "statement", label: "Statement", hint: "Artist statement、项目陈述、创作方法和研究脉络。" },
  { kind: "bio", label: "Bio", hint: "中英文简介、短版/中版/长版 biography。" },
  { kind: "works", label: "作品资料", hint: "单件作品图片、作品说明、尺寸、媒介和年份。" },
  { kind: "other", label: "其他", hint: "暂时无法归类但生成时仍会作为上下文参考。" }
];

export const applicationRegionOptions = [
  { value: "worldwide", label: "全世界" },
  { value: "china", label: "中国大陆及港澳台" },
  { value: "asia", label: "亚洲" },
  { value: "europe", label: "欧洲" },
  { value: "north-america", label: "北美" },
  { value: "uk-europe", label: "英国/欧洲" },
  { value: "us-canada", label: "美国/加拿大" },
  { value: "australia-new-zealand", label: "澳大利亚/新西兰" },
  { value: "online", label: "线上/不限地点" }
];

export const submissionApprovalModeOptions = [
  { value: "review_required", label: "必须审核后提交" },
  { value: "review_optional", label: "可跳过审核准备" },
  { value: "direct_apply", label: "直接申请（高风险）" }
];

export const opportunityFeePreferenceOptions = [
  { value: "conservative", label: "保守：免费/强资助优先" },
  { value: "application_fee_ok", label: "可接受少量申请费" },
  { value: "paid_ok", label: "可看付费项目（标红风险）" }
];

export const opportunityTierPreferenceOptions = [
  { value: "high_tier", label: "高等级优先" },
  { value: "balanced", label: "高等级 + 中等级" },
  { value: "open", label: "更开放：小机构也看" }
];

export function applicationRegionLabel(value: string) {
  return applicationRegionOptions.find((item) => item.value === value)?.label ?? "全世界";
}

export function submissionApprovalModeLabel(value: string) {
  return submissionApprovalModeOptions.find((item) => item.value === value)?.label ?? "必须审核后提交";
}

export function opportunityFeePreferenceLabel(value: string) {
  return opportunityFeePreferenceOptions.find((item) => item.value === value)?.label ?? "保守：免费/强资助优先";
}

export function opportunityTierPreferenceLabel(value: string) {
  return opportunityTierPreferenceOptions.find((item) => item.value === value)?.label ?? "高等级优先";
}

export function materialKindLabel(kind: MaterialKind) {
  return materialKindMeta.find((item) => item.kind === kind)?.label ?? kind;
}

export function prepareSavePayload(data: StudioData) {
  return {
    profile: {
      ...data.profile,
      name: data.profile.nameEn || data.profile.nameZh || data.profile.name,
      location: data.profile.locationEn || data.profile.locationZh || data.profile.location,
      preferences: data.profile.preferencesEn || data.profile.preferencesZh || data.profile.preferences,
      automationBatchLimit: clampBatchLimit(data.profile.automationBatchLimit)
    },
    works: data.works
      .map((work) => ({
        ...emptyWork,
        ...work,
        title: work.titleEn || work.titleZh || work.title,
        medium: work.mediumEn || work.mediumZh || work.medium,
        dimensions: work.dimensionsEn || work.dimensionsZh || work.dimensions
      }))
      .filter(hasWorkContent),
    cv: data.cv
      .map((entry) => ({
        ...emptyCvEntry,
        ...entry,
        category: entry.categoryEn || entry.categoryZh || entry.category,
        title: entry.titleEn || entry.titleZh || entry.title,
        organization: entry.organizationEn || entry.organizationZh || entry.organization,
        location: entry.locationEn || entry.locationZh || entry.location,
        notes: entry.notesEn || entry.notesZh || entry.notes
      }))
      .filter(hasCvContent),
    materialSources: data.materialSources.filter(hasSourceContent)
  };
}

function clampBatchLimit(value: number) {
  if (!Number.isFinite(value)) return 5;
  return Math.max(1, Math.min(100, Math.trunc(value)));
}

function hasWorkContent(work: Work) {
  return [
    work.title,
    work.titleZh,
    work.titleEn,
    work.year,
    work.medium,
    work.mediumZh,
    work.mediumEn,
    work.dimensions,
    work.dimensionsZh,
    work.dimensionsEn,
    work.imagePath,
    work.descriptionZh,
    work.descriptionEn
  ].some((value) => value.trim().length > 0);
}

function hasCvContent(entry: CvEntry) {
  return [
    entry.year,
    entry.title,
    entry.titleZh,
    entry.titleEn,
    entry.organization,
    entry.organizationZh,
    entry.organizationEn,
    entry.location,
    entry.locationZh,
    entry.locationEn,
    entry.notes,
    entry.notesZh,
    entry.notesEn
  ].some((value) => value.trim().length > 0);
}

function hasSourceContent(source: SourceMaterial) {
  return [source.title, source.content, source.fileName, source.filePath].some((value) => value.trim().length > 0);
}
