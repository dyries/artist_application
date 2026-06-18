# Data Model

## SQLite Tables

- `artist_profile`：艺术家事实资料、双语 bio/statement、申请地区偏好、每轮处理数量、提交审核模式、机会费用接受度和机会等级偏好。
- `works`：作品事实资料和双语描述。
- `cv_entries`：CV 条目。
- `material_sources`：原始材料索引、路径、提取文本和类型。
- `opportunities`：机会来源、核验字段、状态、风险、网页原文和公开来源发现结果。
- `applications`：真实申请包的审核摘要、正式材料预览、checklist、selected works、包路径、`run_mode`、`boundary_model` 和提交日志。
- `schema_migrations`：数据库迁移版本记录。
- `activity_log`：重要操作日志。
- `package_manifests`：申请包 manifest 索引。
- `opportunity_search_runs`：每次机会搜索运行、run mode、搜索画像和 limits。
- `opportunity_search_queries`：本轮生成的查询词、语言、地区、机会类型、优先级和执行记录。
- `opportunity_sources`：可插拔搜索来源、来源类型、地区、语言、最近状态和错误。
- `opportunity_candidates`：规范化后的候选链接、canonical URL、标题、来源、发现查询、fingerprint、重复组和初筛状态。
- `opportunity_candidate_sources`：同一候选的多个发现路径和转载/官方来源关系。
- `opportunity_verifications`：候选核验字段、截止日期、费用、资格、材料、来源可信度、核验状态和解释性评分。
- `opportunity_search_coverage_reports`：每轮搜索覆盖审计，包含查询、Provider、发现、去重、初筛、核验、推荐、未覆盖区域和警告。
- `opportunity_fetch_cache`：页面抓取缓存和内容 fingerprint，用于减少重复抓取和支持变化检测。

## Facts Versus Drafts

事实库和草稿库必须分开理解。

- 事实：艺术家姓名、作品年份、媒介、尺寸、CV 条目、材料文件路径、机会官方要求。
- 草稿：statement、bio、表单答案、邮件草稿、申请包文本、作品集选择和排序。

自动化可以基于事实生成草稿，但不能把草稿里的新内容静默写回事实字段。用户确认或编辑后，才可以把新的事实更新到数据库。

## Generated Manifests

每个申请包应包含 `package-manifest.json`，记录：

- manifest 版本
- 生成时间
- 机会 id、标题、机构、URL、截止日期
- 申请包目录
- `internal-notes/`、`user-review/`、`external-submission/` 三类边界目录
- `runMode`、质量检查结果、用户审核节点、机会快照
- portfolio layout output and internal visual/file-quality reports
- 是否需要用户最终审核

manifest 用于后续归档、清理、差异检查和自动化恢复上下文。
