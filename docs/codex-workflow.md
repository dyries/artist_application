# Codex Workflow

本文件只说明 Codex 操作步骤。完整规则见 [rules.md](rules.md)，自动化模式说明见 [automation.md](automation.md)。

## Prerequisites

- Git
- Node.js 20 或更新版本
- npm
- 已安装并登录 Codex
- 可选：Python 3、`pypdf`、`python-docx`、`reportlab`，用于更完整的材料提取和 DOCX/PDF 输出
- 可选：`tesseract`、`pdftoppm`、`pdftotext`、`ffmpeg`/`ffprobe`，用于 OCR、扫描 PDF 和音视频 metadata/still 提取
- 可选：支持视觉输入的外接 API 模型，用于图片材料的多模态分析

## Steps

1. 安装依赖并启动项目：

```bash
npm install
npm run dev
```

2. 在网页中填写艺术家资料和自动化偏好。
3. 上传材料，或把文件放入 `artist-assets/inbox/` 对应分类后点击“扫描材料”。
4. 添加手动机会链接，或准备让 Codex 继续搜索机会。
5. 点击“刷新 Codex 上下文”，生成：

```text
generated/codex/artist-snapshot.json
generated/codex/automation-instructions.md
```

6. 在 Codex 中打开同一个仓库，要求 Codex 读取上述两个文件。
7. 让 Codex 继续执行机会搜索、材料分析和中文 Top 推荐。
8. 用户在网页中选择要申请的机会，或明确告诉 Codex 选择哪些机会。
9. Codex/项目自动化只为已选择机会制作申请包，并输出 `internal-notes/`、`user-review/`、`external-submission/`。
10. 用户审核最终中文摘要和提交文件后，Codex 才能辅助投递；付款、登录、验证码、法律声明、隐私风险和不可逆动作仍需暂停。

## What Codex Should Read

- `generated/codex/artist-snapshot.json`：当前资料、材料索引、机会、申请包和偏好。
- `generated/codex/automation-instructions.md`：由共享机器规则生成的自动化说明。
- `artist-assets/source-materials/`、`artist-assets/works/`、`artist-assets/inbox/`：需要直接理解原始材料时读取。快照中的 `structuredAnalysisExcerpt` 是索引和自动分析，不能替代必要时直接打开原文件、图片或派生 still。
- `data/artist.sqlite`：需要写回或核对数据库状态时读取。
- `generated/applications/*/internal-notes/`、`user-review/`、`external-submission/`：分别用于内部判断、中文用户审核和正式对外材料。

## Boundaries

Codex 自动化不需要 `.env.local` 中的外接 API key。真实材料、数据库、生成申请包、最终提交文件、备份和 API key 不应提交到 Git。提交、付款、登录、验证码、敏感授权和不可逆动作按 [rules.md](rules.md) 中的审核与安全边界执行。

Codex 生成作品集前必须先查看已有作品集材料，再做外部结构/排版调研；生成后应做视觉和结构检查，质量弱时返工或标记 `quality_blocked`。
