# Artist Application AI Workspace

艺术家申请 AI 工作区。项目用于保存艺术家资料、材料索引、机会记录、申请包状态和生成结果；复杂判断、材料理解、机会核验、申请写作和确认后的投递步骤由 Codex 自动化或可选的网页内外接 API 自动化完成。

This project stores artist profiles, source material indexes, opportunity records, package state, and generated outputs. Codex automation or the optional in-app external API path handles interpretation, verification, drafting, package production, and confirmed submission work.

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

可选增强：Python 3、`pypdf`、`python-docx`、`reportlab`、macOS `textutil`、系统 `file` 命令。缺失时项目仍能运行，但部分文本提取、DOCX/PDF 导出或 metadata fallback 会降级。

## Workflow

1. 填写艺术家资料、申请地区、费用偏好、机会等级和审核模式。
2. 导入或扫描 CV、bio、statement、作品说明、作品图、PDF、Word、作品集和其他旧材料。
3. 添加公开 `https://` 机会链接，或让 Codex 继续搜索机会。
4. 点击“刷新 Codex 上下文”，生成 `generated/codex/artist-snapshot.json` 和 `generated/codex/automation-instructions.md`。
5. 运行 Codex 自动化或网页内外接 API 自动化，生成筛选报告和申请包草稿。
6. 人工审核后投递；默认不自动付款、不登录、不处理验证码、不未经确认提交。

生成的申请包通常位于 `generated/applications/<机会编号>-<机会名>/`。示例预览见 [示例申请包](docs/example-application-package.md)。

## Documents

- [长期规则](docs/rules.md)：唯一的人类可读规则总表，覆盖申请、材料、审核、归档和安全边界。
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
- `generated/final-submissions/`：最终提交版归档。

仓库只应提交代码、文档、配置、模板和 `.gitkeep` 占位文件。真实材料、生成结果、SQLite 数据库、备份、`.env.local` 和真实 API key 不应提交。

## Checks

```bash
npm run lint
npm run typecheck
npm test
```

备份：

```bash
npm run backup
```

## Safety

- 本地 `localhost` 可直接使用；非本地主机部署必须配置 `ARTIST_STUDIO_AUTH_USER` + `ARTIST_STUDIO_AUTH_PASSWORD`，或配置 `ARTIST_STUDIO_API_TOKEN`。
- 手动机会链接只接受公开 `https://` 地址，并阻止 localhost、私网、link-local、内网 DNS 解析结果和重定向到内网的地址。
- 默认未经最终确认，不发送邮件、不提交网页表单、不付款、不处理验证码。
- `direct_apply` 只代表当前批次预授权；付款、登录、验证码、敏感授权、资格不明、费用不明、材料缺失或不可逆操作仍必须暂停。

## License

All rights reserved. This repository is publicly visible for review, reference, and personal learning only. No permission is granted to copy, modify, distribute, sublicense, sell, commercially use, host, or publish derivative works without written permission from the owner.
