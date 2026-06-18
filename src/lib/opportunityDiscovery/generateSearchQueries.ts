import type { SearchPlan, SearchQuery } from "./types";

const languageTerms = {
  en: {
    openCall: ["open call", "artist residency", "artist grant", "research fellowship", "commission"],
    institution: ["museum", "foundation", "university", "art centre", "arts council"]
  },
  zh: {
    openCall: ["视觉艺术 驻留 招募", "当代艺术 展览 公开征集", "艺术研究 驻留 项目", "艺术家 资助 申请"],
    institution: ["美术馆", "基金会", "艺术中心", "大学", "文化机构"]
  },
  ja: {
    openCall: ["現代美術 アーティスト・イン・レジデンス 募集", "アーティスト 展覧会 公募", "美術 助成 募集"],
    institution: ["美術館", "財団", "大学", "アートセンター", "文化機関"]
  },
  ko: {
    openCall: ["시각예술 작가 레지던시 공모", "현대미술 전시 공모", "예술가 지원 공모"],
    institution: ["미술관", "재단", "대학", "아트센터", "문화기관"]
  }
};

export function generateSearchQueries(plan: SearchPlan, now = new Date()): SearchQuery[] {
  const year = now.getUTCFullYear();
  const nextYear = year + 1;
  const queries: SearchQuery[] = [];
  for (const language of plan.targetLanguages) {
    const terms = languageTerms[language];
    const mainMedium = plan.profile.mediums[0] || "interdisciplinary art";
    const mainTheme = plan.profile.themes[0] || "artistic research";
    for (const region of plan.targetRegions.slice(0, 4)) {
      for (const opportunityType of plan.targetOpportunityTypes.slice(0, 5)) {
        const localizedType = terms.openCall[Math.min(plan.targetOpportunityTypes.indexOf(opportunityType), terms.openCall.length - 1)] || opportunityType;
        queries.push({
          query: language === "en"
            ? `${mainMedium} ${mainTheme} ${opportunityType} ${region} ${year} ${nextYear}`
            : `${localizedType} ${region} ${year}`,
          language,
          region,
          opportunityType,
          priority: priorityFor(language, region, opportunityType),
          generatedFrom: ["medium", "theme", "opportunityType", "region", "cycleYear"]
        });
      }
      const institution = terms.institution[queries.length % terms.institution.length];
      queries.push({
        query: language === "en"
          ? `${institution} open call artists ${region} ${year}`
          : `${institution} ${terms.openCall[0]} ${year}`,
        language,
        region,
        opportunityType: "institution opportunity",
        priority: 55,
        generatedFrom: ["institutionType", "region", "language"]
      });
    }
  }
  return dedupeQueries(queries)
    .sort((left, right) => right.priority - left.priority || left.query.localeCompare(right.query))
    .slice(0, plan.limits.maxQueriesPerRun);
}

function priorityFor(language: string, region: string, opportunityType: string) {
  let score = 50;
  if (language === "en") score += 8;
  if (region === "worldwide" || region === "Asia" || region === "Europe") score += 8;
  if (/residency|fellowship|grant|驻留|助成|레지던시/i.test(opportunityType)) score += 10;
  return score;
}

function dedupeQueries(queries: SearchQuery[]) {
  const seen = new Set<string>();
  const output: SearchQuery[] = [];
  for (const query of queries) {
    const key = `${query.language}:${query.region}:${query.query.toLowerCase().replace(/\s+/g, " ")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(query);
  }
  return output;
}
