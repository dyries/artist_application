# Codex Workflow

## 中文

这个项目可以在没有外部模型 API key 的情况下配合 Codex 使用。Web app 负责保存资料、索引材料、记录机会和写出快照；Codex 负责理解材料、搜索和核验机会、制作申请包，并在用户明确确认后继续投递步骤。

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
- 项目内模型自动化是可选路径，只用于网页内报告、手动机会链接核验和草稿生成。
- 任何路径都不能在没有用户明确确认时发送邮件、提交表单、付款、处理验证码或完成敏感授权。
- 真实材料、数据库、生成申请包、最终提交文件和 API key 都不应提交到 Git。

## English

This project can be used with Codex without configuring external model API keys. The web app stores profile data, indexes source materials, records opportunities, and exports a workspace snapshot. Codex performs material interpretation, opportunity search and verification, application package production, and user-confirmed submission steps.

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
- In-app model automation is optional and limited to reports, manual opportunity link checks, and draft generation.
- No automation path may send emails, submit forms, pay fees, handle captchas, or complete sensitive authorization without explicit user confirmation.
- Real materials, databases, generated packages, final submission files, and API keys should not be committed to Git.
