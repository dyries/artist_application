import type {
  ArtistProfile,
  OpportunityFeePreference,
  OpportunityTierPreference,
  SubmissionApprovalMode
} from "@/types/domain";
import { Area, Field, NumberField, SelectField } from "./FormControls";
import {
  applicationRegionLabel,
  applicationRegionOptions,
  opportunityFeePreferenceLabel,
  opportunityFeePreferenceOptions,
  opportunityTierPreferenceLabel,
  opportunityTierPreferenceOptions,
  submissionApprovalModeLabel,
  submissionApprovalModeOptions
} from "./studioModel";

type ProfilePanelProps = {
  profile: ArtistProfile;
  setProfile: <K extends keyof ArtistProfile>(key: K, value: ArtistProfile[K]) => void;
};

export function ProfilePanel({ profile, setProfile }: ProfilePanelProps) {
  return (
    <div className="panel stack">
      <h2>艺术家资料</h2>
      <div className="grid-2">
        <Field label="中文姓名" value={profile.nameZh} onChange={(value) => setProfile("nameZh", value)} />
        <Field label="English Name" value={profile.nameEn} onChange={(value) => setProfile("nameEn", value)} />
        <Field label="邮箱" value={profile.email} onChange={(value) => setProfile("email", value)} />
        <Field label="中文所在地" value={profile.locationZh} onChange={(value) => setProfile("locationZh", value)} />
        <Field label="Location in English" value={profile.locationEn} onChange={(value) => setProfile("locationEn", value)} />
        <SelectField
          label="申请地区"
          value={profile.applicationRegion || "worldwide"}
          onChange={(value) => setProfile("applicationRegion", value)}
          options={applicationRegionOptions}
        />
        <NumberField
          label="每轮最多处理数量"
          value={profile.automationBatchLimit || 5}
          min={1}
          max={100}
          onChange={(value) => setProfile("automationBatchLimit", value)}
        />
        <SelectField
          label="提交审核模式"
          value={profile.submissionApprovalMode || "review_required"}
          onChange={(value) => setProfile("submissionApprovalMode", value as SubmissionApprovalMode)}
          options={submissionApprovalModeOptions}
        />
        <SelectField
          label="费用接受度"
          value={profile.opportunityFeePreference || "conservative"}
          onChange={(value) => setProfile("opportunityFeePreference", value as OpportunityFeePreference)}
          options={opportunityFeePreferenceOptions}
        />
        <SelectField
          label="机会等级偏好"
          value={profile.opportunityTierPreference || "high_tier"}
          onChange={(value) => setProfile("opportunityTierPreference", value as OpportunityTierPreference)}
          options={opportunityTierPreferenceOptions}
        />
        <Field label="网站" value={profile.website} onChange={(value) => setProfile("website", value)} />
        <Field label="Instagram" value={profile.instagram} onChange={(value) => setProfile("instagram", value)} />
      </div>
      <p className="notice">
        当前申请地区：{applicationRegionLabel(profile.applicationRegion)}；每轮最多处理 {profile.automationBatchLimit || 5} 个机会；
        审核模式：{submissionApprovalModeLabel(profile.submissionApprovalMode)}；费用接受度：{opportunityFeePreferenceLabel(profile.opportunityFeePreference)}；
        机会等级：{opportunityTierPreferenceLabel(profile.opportunityTierPreference)}。
      </p>
      <div className="grid-2">
        <Area label="中文 Artist Statement" value={profile.statementZh} onChange={(value) => setProfile("statementZh", value)} />
        <Area label="English Artist Statement" value={profile.statementEn} onChange={(value) => setProfile("statementEn", value)} />
      </div>
      <div className="grid-3">
        <Area label="中文 Bio 短版" value={profile.bioZhShort} onChange={(value) => setProfile("bioZhShort", value)} />
        <Area label="中文 Bio 中版" value={profile.bioZhMedium} onChange={(value) => setProfile("bioZhMedium", value)} />
        <Area label="中文 Bio 长版" value={profile.bioZhLong} onChange={(value) => setProfile("bioZhLong", value)} />
        <Area label="English Bio Short" value={profile.bioEnShort} onChange={(value) => setProfile("bioEnShort", value)} />
        <Area label="English Bio Medium" value={profile.bioEnMedium} onChange={(value) => setProfile("bioEnMedium", value)} />
        <Area label="English Bio Long" value={profile.bioEnLong} onChange={(value) => setProfile("bioEnLong", value)} />
      </div>
      <div className="grid-2">
        <Area label="中文申请偏好" value={profile.preferencesZh} onChange={(value) => setProfile("preferencesZh", value)} />
        <Area label="Application Preferences in English" value={profile.preferencesEn} onChange={(value) => setProfile("preferencesEn", value)} />
      </div>
    </div>
  );
}
