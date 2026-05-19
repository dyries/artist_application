# Codex Workflow

## 中文

这个项目可以只配合 Codex 使用，也可以只使用项目内外部模型 API，或两者结合。Web app 负责保存资料、索引材料、记录机会和写出快照；Codex 可以读取这些快照继续理解材料、搜索和核验机会、制作申请包，并按使用者选择的审核模式继续投递步骤。

### 前提

- 安装 Git。
- 安装 Node.js 20 或更新版本。
- 使用 Codex 自动化时，需要安装并登录 Codex。
- 使用项目内模型自动化时，需要准备自己的外部模型 API key。
- 可选：安装 Python 3 和 `pypdf`、`python-docx`、`reportlab`，用于更完整的材料提取和 DOCX/PDF 输出。可通过 `ARTIST_STUDIO_PYTHON` 指定 Python 路径。

### 使用步骤

1. 安装依赖并启动项目：

```bash
npm install
npm run dev
```

2. 在网页中填写艺术家资料，或把材料放入 `artist-assets/inbox/` 对应分类。
3. 使用“扫描材料”或上传入口把材料写入资料库。
4. 点击“刷新 Codex 上下文”，生成：

```text
generated/codex/artist-snapshot.json
generated/codex/automation-instructions.md
```

5. 在 Codex 中打开同一个仓库，要求 Codex 读取这两个文件，并继续执行机会搜索、材料分析、申请包制作或最终归档。

### 能力边界

- Codex 自动化不需要 `.env.local` 中的外部模型 API key。
- 项目内模型自动化由使用者自行选择和配置，可以用于网页内报告、手动机会链接核验和草稿生成。
- 两种方式可以单独使用，也可以组合使用。
- 使用者可以把每轮最多处理数量设为 1-100。
- 提交审核模式可以设为必须审核、可跳过审核准备或直接申请。
- 直接申请代表使用者对当前运行批次做了预授权；但付款、登录、验证码、敏感授权、资格不明、费用不明、材料缺失或不可逆操作仍必须暂停。
- 真实材料、数据库、生成申请包、最终提交文件和 API key 都不应提交到 Git。

## English

This project can be used with Codex only, with in-app external model APIs only, or with both. The web app stores profile data, indexes source materials, records opportunities, and exports a workspace snapshot. Codex can read that snapshot and continue with material interpretation, opportunity search and verification, application package production, and user-confirmed submission steps.

### Prerequisites

- Install Git.
- Install Node.js 20 or newer.
- Install and sign in to Codex when using Codex automation.
- Prepare external model API keys when using in-app model automation.
- Optional: install Python 3 with `pypdf`, `python-docx`, and `reportlab` for stronger material extraction and DOCX/PDF export. Set `ARTIST_STUDIO_PYTHON` to choose a Python executable.

### Workflow

1. Install dependencies and start the app:

```bash
npm install
npm run dev
```

2. Fill in the artist profile in the app, or place materials under the matching `artist-assets/inbox/` category.
3. Scan or upload materials so the app records them.
4. Use “Refresh Codex Context” to generate:

```text
generated/codex/artist-snapshot.json
generated/codex/automation-instructions.md
```

5. Open the same repository in Codex, ask Codex to read those two files, and continue with opportunity research, material analysis, application package preparation, or final archiving.

### Boundaries

- Codex automation does not require external model API keys in `.env.local`.
- In-app model automation is user-configured and can be used for reports, manual opportunity link checks, and draft generation.
- The two modes can be used separately or together.
- Users can set the maximum number of opportunities per run from 1 to 100.
- Submission approval mode can be review required, review optional, or direct apply.
- Direct apply is pre-authorization for the current run batch; automation must still pause for payment, login, captcha, sensitive authorization, unclear eligibility, unclear fees, missing required materials, or irreversible actions.
- Real materials, databases, generated packages, final submission files, and API keys should not be committed to Git.
