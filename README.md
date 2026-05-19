# Artist Application AI Workspace

艺术家申请 AI 工作区。项目负责保存艺术家资料、材料索引、机会记录、申请包状态和生成结果；复杂判断、材料理解、机会核验、申请写作和确认后的投递步骤由 Codex 自动化或可选的项目内模型自动化完成。

Artist Application AI Workspace stores artist profiles, source material indexes, opportunity records, application package state, and generated outputs. Interpretation, opportunity verification, application writing, package production, and confirmed submission steps are handled by Codex automation or by the optional in-app model automation path.

## 启动

```bash
npm install
npm run dev
```

开发服务器启动后，终端会显示访问地址；端口以终端输出为准。

## 自动化方式

项目有两条自动化路径：

- Codex 自动化：适合完整工作流。使用者需要在 Codex 中打开这个仓库，让 Codex 读取 `generated/codex/artist-snapshot.json` 和 `generated/codex/automation-instructions.md`。这条路径不需要在项目里配置 DeepSeek、OpenAI、Gemini 或 Claude API key。
- 项目内模型自动化：适合在网页内生成报告、核验手动机会链接和生成草稿。需要在 `.env.local` 配置外部模型 API key。它不能替代 Codex 的实时核验、复杂文件处理和最终投递确认。

刷新 Codex 上下文的方式：

1. 启动项目并填写或导入资料。
2. 在网页里点击“刷新 Codex 上下文”。
3. 在 Codex 中要求自动化读取 `generated/codex/` 下的快照和说明，并继续机会搜索、材料分析或申请包制作。

## Automation Modes

There are two automation paths:

- Codex automation: the full workflow path. Open this repository in Codex and ask Codex to read `generated/codex/artist-snapshot.json` and `generated/codex/automation-instructions.md`. This path does not require DeepSeek, OpenAI, Gemini, or Claude API keys in the project.
- In-app model automation: a secondary path for reports, manual opportunity link checks, and draft generation inside the web app. It requires model API keys in `.env.local` and does not replace Codex verification, complex file handling, or explicit submission approval.

## 长期项目文档

- [长期规则](docs/rules.md)：申请、材料、审核、最终归档和安全边界。
- [自动化说明](docs/automation.md)：Codex 自动化和项目内外部模型自动化的职责边界。
- [Codex 使用流程](docs/codex-workflow.md)：如何在 Codex 中复现完整自动化工作流。
- [数据模型](docs/data-model.md)：SQLite 表、事实/草稿分层、生成文件 manifest。
- [状态生命周期](docs/status-lifecycle.md)：机会和申请包状态如何流转。
- [维护手册](docs/maintenance.md)：Git、备份、测试和发布检查。

## 项目目录

- `artist-assets/inbox/`：投放新原始材料的入口，按 CV、bio、statement、portfolio、works、work-images、other 分类。
- `artist-assets/source-materials/`：页面导入后保存的原始 PDF、Word、图片和文本材料。
- `artist-assets/works/`：整理后的正式作品图片或申请用图片。
- `data/artist.sqlite`：SQLite 数据库，保存材料索引、整理后的资料、机会、申请包和状态。
- `generated/codex/`：给 Codex 自动化读取的资料快照和说明。
- `generated/reports/`：自动化生成的筛选报告和工作报告。
- `generated/applications/`：自动化生成的申请包。
- `generated/final-submissions/`：最终提交版归档。

## 安装和使用

仓库只包含代码、规则、模板和 `.gitkeep` 占位文件。个人材料、生成结果、SQLite 数据库、备份和 API key 不应提交。

默认 `.gitignore` 已经忽略：

```text
.env
.env.*
!.env.example
data/*.sqlite
data/*.sqlite-*
artist-assets/inbox/**
artist-assets/source-materials/**
artist-assets/works/**
generated/**
```

克隆后安装并启动：

```bash
npm install
cp .env.example .env.local
npm run dev
```

如果只用 Codex 自动化，可以不配置外部模型 API。项目内 AI 自动化需要通过 `.env.local` 配置 DeepSeek、OpenAI、Gemini、Claude 或其他兼容接口 key。不要把 `.env.local` 或任何真实 key 提交到 Git。

For Codex-only usage, no external model API key is required. In-app model automation requires keys in `.env.local`; never commit real credentials.

## 常用检查

```bash
npm run lint
npm run typecheck
npm test
```

备份：

```bash
npm run backup
```

备份会写入 `backups/YYYY-MM-DDTHH-mm-ss/`，该目录用于运行环境内的数据留存，不应提交到 Git。

## 安全边界

- 未经用户最终确认，不发送邮件、不提交网页表单、不付款、不处理验证码。
- 用户确认后，Codex 自动化可以继续执行投递步骤，并记录投递结果。
- 项目代码不保存第三方平台密码；涉及登录、验证码、付款或敏感授权时，需要用户介入。
