# Artist Application AI Workspace

艺术家申请 AI 工作区。项目负责保存艺术家资料、材料索引、机会记录、申请包状态和生成结果；复杂判断、材料理解、机会核验、申请写作和确认后的投递步骤由 Codex 自动化或可选的项目内模型自动化完成。

Artist Application AI Workspace stores artist profiles, source material indexes, opportunity records, application package state, and generated outputs. Interpretation, opportunity verification, application writing, package production, and confirmed submission steps are handled by Codex automation or by the optional in-app model automation path.

## 运行前提

- Git：用于克隆仓库和版本管理。
- Node.js 20 或更新版本：用于运行 Next.js 应用。
- npm：随 Node.js 安装，用于安装依赖和运行脚本。
- Codex：可选；需要使用 Codex 自动化时安装并登录 Codex。
- 外部模型 API key：可选；只在使用项目内模型自动化时需要，例如 DeepSeek、OpenAI、Gemini、Claude 或兼容 API。

## Requirements

- Git: clone the repository and manage versions.
- Node.js 20 or newer: run the Next.js app.
- npm: install dependencies and run scripts.
- Codex: optional; required only for Codex automation.
- External model API keys: optional; required only for in-app model automation, such as DeepSeek, OpenAI, Gemini, Claude, or compatible APIs.

## 启动

```bash
npm install
npm run dev
```

开发服务器启动后，终端会显示访问地址；端口以终端输出为准。

## 自动化选择

使用者可以按自己的工具和预算选择自动化方式：

- 只用 Codex：在 Codex 中打开这个仓库，让 Codex 读取 `generated/codex/artist-snapshot.json` 和 `generated/codex/automation-instructions.md`。这种方式不需要在项目里配置外部模型 API key。
- 只用项目内模型：在 `.env.local` 配置 DeepSeek、OpenAI、Gemini、Claude 或兼容 API，在网页内生成报告、核验手动机会链接和生成草稿。
- Codex + 项目内模型：网页内模型负责快速草稿和初步整理，Codex 负责复杂材料理解、实时搜索、机会核验、申请包制作和用户确认后的投递步骤。

使用者也可以设置每轮最多处理数量，范围是 1-100。提交审核模式可以选择“必须审核后提交”“可跳过审核准备”或“直接申请”。直接申请代表使用者对当前运行批次做了预授权；遇到付款、登录、验证码、敏感授权、资格不明、费用不明或材料缺失时仍必须暂停。

刷新 Codex 上下文的方式：

1. 启动项目并填写或导入资料。
2. 在网页里点击“刷新 Codex 上下文”。
3. 在 Codex 中要求自动化读取 `generated/codex/` 下的快照和说明，并继续机会搜索、材料分析或申请包制作。

## Automation Choices

Users can choose the automation setup that fits their tools and budget:

- Codex only: open this repository in Codex and ask Codex to read `generated/codex/artist-snapshot.json` and `generated/codex/automation-instructions.md`. This mode does not require external model API keys in the project.
- In-app model only: configure DeepSeek, OpenAI, Gemini, Claude, or a compatible API in `.env.local` and use the web app to generate reports, check manually added opportunity links, and draft packages.
- Codex + in-app model: use the web app model for fast drafts and first-pass organization, then use Codex for complex material interpretation, live research, opportunity verification, package production, and user-confirmed submission steps.

Users can set the maximum number of opportunities per run from 1 to 100. Submission approval mode can be set to review required, review optional, or direct apply. Direct apply is pre-authorization for the current run batch; automation must still pause for payment, login, captcha, sensitive authorization, unclear eligibility, unclear fees, or missing required materials.

## 长期项目文档

- [长期规则](docs/rules.md)：申请、材料、审核、最终归档和安全边界。
- [自动化说明](docs/automation.md)：Codex 自动化和项目内外部模型自动化的选择方式与职责边界。
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

可以只用 Codex 自动化，也可以只配置项目内 AI 自动化，或两者结合使用。项目内 AI 自动化需要通过 `.env.local` 配置 DeepSeek、OpenAI、Gemini、Claude 或其他兼容接口 key。不要把 `.env.local` 或任何真实 key 提交到 Git。

Users can choose Codex automation, in-app model automation, or both. In-app model automation requires keys in `.env.local`; never commit real credentials.

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

- 默认未经用户最终确认，不发送邮件、不提交网页表单、不付款、不处理验证码。
- 如果使用者把提交审核模式设为“直接申请”，自动化可以在当前批次上跳过逐项审核；但遇到付款、登录、验证码、敏感授权、资格不明、费用不明或材料缺失时必须暂停。
- 项目代码不保存第三方平台密码；涉及登录、验证码、付款或敏感授权时，需要用户介入。
