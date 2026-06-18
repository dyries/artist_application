/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");

require.extensions[".ts"] = function compileTs(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX
    },
    fileName: filename
  });
  module._compile(output.outputText, filename);
};

const { buildSearchProfile } = require("../src/lib/opportunityDiscovery/buildSearchProfile.ts");
const { buildSearchPlan } = require("../src/lib/opportunityDiscovery/buildSearchPlan.ts");
const { generateSearchQueries } = require("../src/lib/opportunityDiscovery/generateSearchQueries.ts");
const { normalizeCandidates } = require("../src/lib/opportunityDiscovery/normalizeCandidate.ts");
const { deduplicateCandidates } = require("../src/lib/opportunityDiscovery/deduplicateCandidates.ts");
const { triageCandidates } = require("../src/lib/opportunityDiscovery/triageCandidates.ts");
const { verifyCandidates } = require("../src/lib/opportunityDiscovery/verifyCandidates.ts");
const { scoreCandidates } = require("../src/lib/opportunityDiscovery/scoreCandidates.ts");
const { buildDiverseShortlist } = require("../src/lib/opportunityDiscovery/buildDiverseShortlist.ts");
const { auditSearchCoverage } = require("../src/lib/opportunityDiscovery/auditSearchCoverage.ts");

const profile = {
  id: 1,
  name: "Test Artist",
  nameZh: "测试艺术家",
  nameEn: "Test Artist",
  email: "",
  location: "Shanghai, China",
  locationZh: "中国上海",
  locationEn: "Shanghai, China",
  website: "",
  instagram: "",
  bioZhShort: "",
  bioZhMedium: "艺术家使用绘画、装置和档案研究处理记忆、身份与审查。",
  bioZhLong: "",
  bioEnShort: "",
  bioEnMedium: "The artist works with painting, installation, archives, memory, identity, and censorship.",
  bioEnLong: "",
  statementZh: "围绕隐藏叙事和图像研究展开。",
  statementEn: "A practice around hidden narratives and visual research.",
  preferences: "",
  preferencesZh: "",
  preferencesEn: "Prefers funded residencies and research fellowships.",
  applicationRegion: "worldwide",
  automationBatchLimit: 5,
  submissionApprovalMode: "review_required",
  opportunityFeePreference: "conservative",
  opportunityTierPreference: "high_tier",
  updatedAt: ""
};

const searchProfile = buildSearchProfile(profile);
assert(searchProfile.mediums.some((item) => /painting|installation|绘画|装置/i.test(item)), "artist profile should extract mediums");
assert(searchProfile.themes.some((item) => /memory|censorship|archives|identity|记忆|审查|档案|身份/i.test(item)), "artist profile should extract themes");
assert.equal(searchProfile.fundingPreferences.acceptsApplicationFees, false, "conservative profile should reject fees by default");

const plan = buildSearchPlan(profile);
const queries = generateSearchQueries(plan, new Date("2026-06-18T00:00:00Z"));
assert(queries.length <= plan.limits.maxQueriesPerRun, "query budget should be enforced");
assert(queries.some((query) => query.language === "en"), "English queries should be generated");
assert(queries.some((query) => query.language === "zh"), "Chinese queries should be generated");
assert(queries.some((query) => query.language === "ja"), "Japanese queries should be generated");
assert(queries.some((query) => query.language === "ko"), "Korean queries should be generated");
assert.equal(new Set(queries.map((query) => `${query.language}:${query.region}:${query.query}`)).size, queries.length, "queries should be deduplicated");
assert(plan.limits.discoveryCandidateLimit > plan.limits.triageCandidateLimit, "discovery limit should exceed triage limit");
assert(plan.limits.triageCandidateLimit > plan.limits.verificationCandidateLimit, "triage limit should exceed verification limit");
assert(plan.limits.verificationCandidateLimit > plan.limits.shortlistLimit, "verification limit should exceed shortlist limit");

const searchResult = {
  title: "Open Call: Research Residency 2026",
  url: "https://example.org/opportunities/open-call/?utm_source=newsletter&fbclid=abc#apply",
  snippet: "International artists can apply by 2026-10-01. Portfolio and proposal required. Accommodation and stipend available.",
  sourceName: "Example Foundation",
  sourceType: "institution_site",
  sourceUrl: "https://example.org/opportunities",
  discoveryQuery: queries[0].query,
  discoveryLanguage: queries[0].language,
  discoveredAt: "2026-06-18T00:00:00Z"
};
const normalized = normalizeCandidates([
  searchResult,
  { ...searchResult, url: "https://example.org/opportunities/open-call/?utm_campaign=x", sourceName: "Mirror Board", sourceType: "curated_board" },
  { ...searchResult, title: "Research Residency PDF", url: "https://example.org/opportunities/open-call.pdf", snippet: "PDF application pack for the same research residency." }
]);
assert(!normalized[0].url.includes("utm_"), "UTM parameters should be removed");
assert(!normalized[0].url.includes("fbclid"), "tracking parameters should be removed");
assert.equal(normalized[0].canonicalUrl, normalized[0].normalizedUrl, "canonical URL should be stored");
const deduped = deduplicateCandidates(normalized);
assert(deduped.length < normalized.length, "same opportunity from multiple sources should dedupe");
assert(deduped[0].alternateSources.length >= 1, "alternate source paths should be retained");

const triaged = triageCandidates(deduped, searchProfile, new Date("2026-06-18T00:00:00Z"));
assert.equal(triaged[0].triageStatus, "keep", "open future candidate should pass triage");
const expired = triageCandidates(normalizeAndDedupe("Past Open Call", "Applications closed. Deadline 2024-01-01."), searchProfile, new Date("2026-06-18T00:00:00Z"));
assert.equal(expired[0].triageStatus, "reject", "expired candidate should be rejected");
const ineligible = triageCandidates(normalizeAndDedupe("US only open call", "Open call for U.S. citizens only. Deadline 2026-10-01."), searchProfile, new Date("2026-06-18T00:00:00Z"));
assert.equal(ineligible[0].triageStatus, "reject", "clear eligibility conflict should be rejected");
const unknownDeadline = triageCandidates(normalizeAndDedupe("Current Open Call", "International artists can apply. Portfolio required."), searchProfile, new Date("2026-06-18T00:00:00Z"));
const verifiedUnknown = verifyCandidates(unknownDeadline, plan, new Date("2026-06-18T00:00:00Z"));
assert.equal(verifiedUnknown[0].deadline, "", "unknown deadline should remain unknown, not fabricated");

const verified = verifyCandidates(triaged, plan, new Date("2026-06-18T00:00:00Z"));
const scored = scoreCandidates(verified, searchProfile, new Date("2026-06-18T00:00:00Z"));
assert(scored[0].scoreBreakdown.total > 0, "scoring should produce an explainable total");
assert(scored[0].scoreBreakdown.sourceReliability > 0, "source reliability should be scored separately");

const many = Array.from({ length: 8 }, (_, index) => ({
  ...scored[0],
  url: `https://example${index}.org/open-call`,
  sourceName: index < 4 ? "Same Board" : `Source ${index}`,
  opportunityType: index % 2 === 0 ? "artist residency" : "exhibition open call",
  scoreBreakdown: { ...scored[0].scoreBreakdown, total: 90 - index }
}));
const shortlist = buildDiverseShortlist(many, plan);
assert.equal(shortlist.length, plan.limits.shortlistLimit, "shortlist should default to five");
assert(shortlist.filter((item) => item.sourceName === "Same Board").length <= 2, "shortlist should avoid one-source dominance");

const providerResults = [
  { provider: "configured-web-search", ok: false, results: [], error: "not configured" },
  { provider: "curated-boards", ok: true, results: [searchResult] }
];
const coverage = auditSearchCoverage({ plan, queries, providerResults, normalized, deduped, triaged, verified: scored, shortlisted: shortlist });
assert.equal(coverage.providersFailed[0].provider, "configured-web-search", "unconfigured providers should be reported");
assert(coverage.warnings.some((warning) => /fixed|configured|provider|source/i.test(warning)), "coverage should warn when provider coverage is limited");
assert.equal(coverage.verifiedCount, scored.length, "coverage should count verified candidates");
assert(plan.limits.verificationCandidateLimit > plan.limits.shortlistLimit, "verification pool should exceed final recommendation count");

const dbSource = fs.readFileSync(path.join(root, "src/lib/db.ts"), "utf8");
for (const table of [
  "opportunity_search_runs",
  "opportunity_search_queries",
  "opportunity_sources",
  "opportunity_candidates",
  "opportunity_candidate_sources",
  "opportunity_verifications",
  "opportunity_search_coverage_reports",
  "opportunity_fetch_cache"
]) {
  assert(dbSource.includes(table), `migration should include ${table}`);
}
assert(dbSource.includes("runMigration(database, 3"), "migration should be versioned for old database compatibility");
assert(dbSource.includes("CREATE TABLE IF NOT EXISTS"), "migration should be additive");

const pagesSource = fs.readFileSync(path.join(root, "src/lib/opportunityPages.ts"), "utf8");
assert(pagesSource.includes("renderOpportunityPage"), "dynamic page verification path should exist");
assert(pagesSource.includes("playwright"), "Playwright path should be available for dynamic pages");

console.log("Opportunity discovery tests passed.");

function normalizeAndDedupe(title, snippet) {
  return deduplicateCandidates(normalizeCandidates([{
    ...searchResult,
    title,
    snippet,
    url: `https://example.org/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
  }]));
}
