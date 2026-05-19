# Data Model

## SQLite Tables

- `artist_profile`：艺术家事实资料、双语 bio/statement、申请地区偏好、每轮处理数量和提交审核模式。
- `works`：作品事实资料和双语描述。
- `cv_entries`：CV 条目。
- `material_sources`：原始材料索引、路径、提取文本和类型。
- `opportunities`：机会来源、核验字段、状态、风险和网页原文。
- `applications`：申请包草稿、checklist、selected works、包路径和提交日志。
- `schema_migrations`：数据库迁移版本记录。
- `activity_log`：重要操作日志。
- `package_manifests`：申请包 manifest 索引。

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
- 主要草稿文件、审核文件、选图目录和机会快照
- 是否需要用户审核

manifest 用于后续归档、清理、差异检查和自动化恢复上下文。
