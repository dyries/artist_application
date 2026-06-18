# Automation Guide

本文件只说明自动化模式和职责边界。完整审核、费用、机会等级、作品集、归档和安全规则见 [rules.md](rules.md)。机器可读规则集中在 `src/lib/automationRules.ts`。

## Modes

### Codex Only

- 不需要在项目里配置外接 API key。
- 在 Codex 中打开仓库，读取 `generated/codex/artist-snapshot.json` 和 `generated/codex/automation-instructions.md`。
- 适合实时搜索、网页核验、复杂材料理解、作品集制作、DOCX/PDF 文件制作，以及用户确认后的投递步骤。

### In-App External API Only

- 需要在仓库根目录 `.env.local` 配置外接 API。
- 支持 OpenAI-compatible `/chat/completions` 网关，以及 DeepSeek、OpenAI、Gemini、Claude 等 provider block。
- 适合网页内生成报告、核验手动机会链接的已抓取文本，并且只为 `selected_by_user` 机会生成最终审核包。
- 不负责自动付款、登录、验证码处理或未经确认的外部提交。

### Codex + In-App External API

- 网页内外接 API 负责快速草稿和初步整理。
- Codex 负责高风险核验、复杂材料理解、文件制作和确认后的投递动作。
- 两条路径都必须遵守同一套规则来源：`docs/rules.md` 和 `src/lib/automationRules.ts`。
- 两条路径都必须保持 `internal-notes/`、`user-review/`、`external-submission/` 边界，并运行对外文本和作品集质量检查。

## Codex Workspace Export

点击“刷新 Codex 上下文”后，项目会生成或更新：

```text
generated/codex/artist-snapshot.json
generated/codex/automation-instructions.md
```

Codex 自动化应先读取这两个文件，再按需要检查原始材料。

## Manual Opportunity Links

- 用户可以添加公开 `https://` 机会页面链接。
- 项目会先把链接作为待核验机会保存。
- 网页内外接 API 自动化可抓取公开页面文本并做初步核验。
- 如果页面需要登录、验证码、付款、动态渲染或人工判断，应交给 Codex 浏览器工作流或用户介入。
- SSRF 防护和资源上限属于安全边界，不应在自动化模式切换时放宽。

## Global Opportunity Discovery

项目内自动化现在按分阶段搜索管线运行：

```text
buildSearchProfile
→ buildSearchPlan
→ generateSearchQueries
→ discoverCandidates
→ normalizeCandidates
→ deduplicateCandidates
→ triageCandidates
→ verifyCandidates
→ scoreCandidates
→ buildDiverseShortlist
→ auditSearchCoverage
```

系统会用艺术家的媒介、主题、方法、地区偏好、费用接受度和机会等级偏好生成多语言查询，并通过可插拔 Provider 搜索。默认 Provider 包括手动链接、策展机会平台和机构官网 registry；配置 `ARTIST_STUDIO_WEB_SEARCH_ENDPOINT` 或 `ARTIST_STUDIO_DISCOVERY_RSS_URLS` 后可以扩展 web search / RSS。Provider 未配置或失败会写入覆盖审计，不会伪装成已全面覆盖。

用户手动添加的链接不会走旁路：它们会通过 manual provider 进入同一套规范化、去重、初筛、核验、评分、推荐和 coverage audit。深度核验会在评分前尽量读取候选页面证据，优先使用公开页面抓取、Playwright 动态渲染、公开附件/PDF 文本和表单摘要。查询结果和页面内容会写入缓存，减少重复抓取；缓存命中、Provider 不可用、抓取失败和覆盖不足仍会保留在运行记录与覆盖报告里。

发现、初筛、核验和最终推荐使用独立预算：查询数、单查询结果数、发现候选数、初筛数、核验数、最终 shortlist 数和制包数分开控制。`automationBatchLimit` 只控制已选机会的制包/深度处理数量；`ARTIST_STUDIO_APPLICATION_PREPARATION_LIMIT` 作为独立制包安全上限，不再截断搜索发现或核验池。

真实运行会把核验池写入机会库，约五个最终推荐标记为 `recommended`，其他保留为 `new` 候选。test/mock 只写报告，不污染真实机会状态。

## Review Nodes

用户默认只审核两次：先选择申请哪些推荐机会，再确认最终提交包是否可以提交。自动化中间的作品选择、CV 调整、bio、statement、表格答案、作品集文字、邮件草稿和文件检查都由 AI 完成并记录到 internal notes。

## Test And Mock Runs

设置 `ARTIST_STUDIO_RUN_MODE=test` 或 `mock` 时，输出写入 `generated/test-runs/` 或 `generated/mock-runs/`，manifest 会标记 run mode，并且不会创建真实申请记录或进入真实 ready/submitted/waiting 状态。

## External API Configuration

只用 Codex 自动化时可以跳过本节。

```bash
cp .env.example .env.local
npm run dev
```

在 `.env.local` 中只启用一个 provider block，填入自己的 key、base URL 和模型名。不要提交 `.env.local` 或真实凭据。修改配置后重启开发服务器。
