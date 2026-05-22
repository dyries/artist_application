# Codex Workflow

本文件只说明 Codex 操作步骤。完整规则见 [rules.md](rules.md)，自动化模式说明见 [automation.md](automation.md)。

## Prerequisites

- Git
- Node.js 20 或更新版本
- npm
- 已安装并登录 Codex
- 可选：Python 3、`pypdf`、`python-docx`、`reportlab`，用于更完整的材料提取和 DOCX/PDF 输出

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
7. 让 Codex 继续执行机会搜索、材料分析、申请包制作、审核文件生成、最终归档或用户确认后的投递步骤。

## What Codex Should Read

- `generated/codex/artist-snapshot.json`：当前资料、材料索引、机会、申请包和偏好。
- `generated/codex/automation-instructions.md`：由共享机器规则生成的自动化说明。
- `artist-assets/source-materials/`、`artist-assets/works/`、`artist-assets/inbox/`：需要直接理解原始材料时读取。
- `data/artist.sqlite`：需要写回或核对数据库状态时读取。

## Boundaries

Codex 自动化不需要 `.env.local` 中的外接 API key。真实材料、数据库、生成申请包、最终提交文件、备份和 API key 不应提交到 Git。提交、付款、登录、验证码、敏感授权和不可逆动作按 [rules.md](rules.md) 中的审核与安全边界执行。
