# Artist Application AI Workspace

艺术家申请 AI 工作区。项目用于保存艺术家资料、材料索引、机会记录、申请包状态和生成结果；复杂判断、材料理解、机会核验、申请写作和确认后的投递步骤由 Codex 自动化或可选的网页内外接 API 自动化完成。

This project stores artist profiles, source material indexes, opportunity records, package state, and generated outputs. Codex automation or the optional in-app external API path handles interpretation, verification, drafting, package production, and confirmed submission work.

## What This App Is

A local-first artist application workspace for organizing materials, tracking opportunities, and generating reviewable application packages.

## What This App Is Not

It does not automatically submit applications, pay fees, bypass captchas, log into accounts, or guarantee eligibility.

## Quick Start

```bash
npm install
npm run dev
```

开发服务器启动后，按终端显示的地址访问。macOS 用户也可以双击 `启动本地项目.command`，它会使用 `http://127.0.0.1:3000` 并在启动成功后打开浏览器。

需要网页内外接 API 自动化时，复制 `.env.example` 为 `.env.local`，选择一个 provider block 填入自己的 key、base URL 和模型名，然后重启开发服务器。只用 Codex 自动化时不需要配置外接 API key。

## Requirements

- Git
- Node.js 20 或更新版本
- npm
- Codex，可选，只在使用 Codex 自动化时需要
- 外接 API key，可选，只在使用网页内 API 自动化时需要

可选增强：Python 3、`pypdf`、`python-docx`、`reportlab`、macOS `textutil`、系统 `file` 命令、`tesseract`、`pdftoppm`、`pdftotext`、`ffmpeg`/`ffprobe`。缺失时项目仍能运行，但部分 OCR、扫描 PDF、音视频 still/transcript、DOCX/PDF 导出或 metadata fallback 会降级。

## Multimodal Materials and Opportunity Pages

材料扫描现在会保存原文件路径、提取文本、OCR 结果、系统 metadata、嵌入媒体/派生视频 stills、以及结构化 `analysis`。配置支持视觉输入的 OpenAI-compatible、Gemini 或 Claude 模型后，图片材料会额外生成多模态视觉分析；未配置时会明确标记为 `not_configured`，不会假装看过图片。

机会链接抓取现在优先使用 Playwright 渲染 JS 页面，失败时退回静态抓取；会识别页面表单字段，发现公开 PDF/Word/PPT 附件并下载抽取文本。登录、验证码、付款、敏感授权或非公开附件仍会暂停给 Codex/browser 或人工处理。

## Workflow

1. 填写艺术家资料、申请地区、费用偏好、机会等级和审核模式。
2. 导入或扫描 CV、bio、statement、作品说明、作品图、PDF、Word、作品集和其他旧材料。
3. 添加公开 `https://` 机会链接，或让 Codex 继续搜索机会。
4. 点击“刷新 Codex 上下文”，生成 `generated/codex/artist-snapshot.json` 和 `generated/codex/automation-instructions.md`。
5. 自动化从公开机会源发现候选链接，核验真实性、截止日期、费用、资格、地点、语言和材料要求，并输出中文 Top 推荐。
6. 用户只审核第一节点：选择申请哪些机会。页面中点击“选择申请”后，该机会进入 `selected_by_user`。
7. AI 自动准备 CV、bio、statement、application answers、portfolio、captions、email draft 和 file checklist，并运行质量检查。
8. 用户只审核第二节点：最终提交包是否可以提交。未经明确确认，不发送邮件、不提交表单、不付款、不登录、不处理验证码。

真实申请包位于 `generated/applications/<机会编号>-<机会名>/`，并固定分为 `internal-notes/`、`user-review/`、`external-submission/`。测试/模拟运行写入 `generated/test-runs/` 或 `generated/mock-runs/`，不会进入真实申请状态。示例预览见 [示例申请包](docs/example-application-package.md)。

## Documents

- [长期规则](docs/rules.md)：唯一的人类可读规则总表，覆盖申请、材料、审核、归档和安全边界。
- [审计报告](docs/audit-report.md)：本轮重构发现的问题和已修复项。
- [申请规则](docs/application_rules.md)：AI 自动化边界和用户审核节点。
- [提交边界](docs/submission_boundary_rules.md)：internal/user/external 文件分层和对外禁用词。
- [审核政策](docs/review_policy.md)：中文审核和最终确认模型。
- [作品集规则](docs/portfolio_generation_rules.md)：已有作品集参考、联网调研和质量检查。
- [测试运行隔离](docs/test_run_policy.md)：real/test/mock 输出与状态隔离。
- [自动化说明](docs/automation.md)：Codex、网页内外接 API 以及组合模式的职责边界。
- [Codex 使用流程](docs/codex-workflow.md)：如何在 Codex 中复现完整工作流。
- [数据模型](docs/data-model.md)：SQLite 表、事实/草稿分层和生成文件 manifest。
- [状态生命周期](docs/status-lifecycle.md)：机会和申请包状态如何流转。
- [维护手册](docs/maintenance.md)：Git、备份、测试和发布检查。

机器可读规则集中在 `src/lib/automationRules.ts`，由 `src/lib/codexWorkspace.ts` 和 `src/lib/projectAutomation.ts` 生成 Codex instructions 与外接 API prompt。

## Project Directories

- `artist-assets/inbox/`：投放新原始材料的入口。
- `artist-assets/source-materials/`：导入后保存的原始 PDF、Word、图片和文本材料。
- `artist-assets/works/`：整理后的正式作品图片或申请用图片。
- `data/artist.sqlite`：SQLite 数据库。
- `generated/codex/`：给 Codex 自动化读取的快照和说明。
- `generated/reports/`：自动化生成的筛选报告和工作报告。
- `generated/applications/`：自动化生成的申请包。
- `generated/test-runs/`、`generated/mock-runs/`：测试/模拟运行输出，不进入真实申请状态。
- `generated/final-submissions/`：最终提交版归档。

仓库只应提交代码、文档、配置、模板和 `.gitkeep` 占位文件。真实材料、生成结果、SQLite 数据库、备份、`.env.local` 和真实 API key 不应提交。

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run test:structure
npm run build
```

Or run the full local gate:

```bash
npm run check
```

备份：

```bash
npm run backup
```

## Safety

- 本地 `localhost` 可直接使用；非本地主机部署必须配置 `ARTIST_STUDIO_AUTH_USER` + `ARTIST_STUDIO_AUTH_PASSWORD`，或配置 `ARTIST_STUDIO_API_TOKEN`。
- 手动机会链接只接受公开 `https://` 地址，并阻止 localhost、私网、link-local、内网 DNS 解析结果和重定向到内网的地址。
- 默认未经最终确认，不发送邮件、不提交网页表单、不付款、不处理验证码。
- `direct_apply` 只代表当前批次准备工作预授权，不代表最终外部提交授权；付款、登录、验证码、敏感授权、法律声明、隐私风险、资格不明、费用不明、材料缺失或不可逆操作仍必须暂停。
- `ARTIST_STUDIO_RUN_MODE=test` 或 `mock` 会写入隔离目录和 manifest，不创建真实申请记录，不进入 ready/submitted/waiting/final-submissions。
- 公开机会发现默认读取多个 open call / residency / grant 来源页；可用 `ARTIST_STUDIO_DISCOVERY_SOURCE_URLS` 配置更多公开 `https://` 来源。

## License

All rights reserved. This repository is publicly visible for review, reference, and personal learning only. No permission is granted to copy, modify, distribute, sublicense, sell, commercially use, host, or publish derivative works without written permission from the owner.
