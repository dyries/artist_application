# Artist Application AI Workspace

本地艺术家申请 AI 工作区。项目负责保存艺术家资料、材料索引、机会记录、申请包状态和生成结果；复杂判断、材料理解、机会核验、申请写作和确认后的投递步骤由 Codex 自动化或可选的项目内外部模型自动化完成。

## 启动

```bash
npm install
npm run dev
```

开发服务器启动后，终端会显示可访问的本地地址。Next.js 默认通常是：

```text
http://localhost:3000
```

如果该端口已被占用，Next.js 可能会使用其他端口，请以终端输出为准。

本仓库额外提供了一个 macOS 便捷启动脚本：

```text
启动 Artist Studio.command
```

这个脚本只适用于 macOS，会尝试用固定端口 `3020` 启动并打开浏览器。Windows、Linux 或不使用该脚本时，直接使用 `npm run dev`。

## 长期项目文档

- [长期规则](docs/rules.md)：申请、材料、审核、最终归档和安全边界。
- [自动化说明](docs/automation.md)：Codex 自动化和项目内外部模型自动化的职责边界。
- [数据模型](docs/data-model.md)：SQLite 表、事实/草稿分层、生成文件 manifest。
- [状态生命周期](docs/status-lifecycle.md)：机会和申请包状态如何流转。
- [维护手册](docs/maintenance.md)：Git、备份、测试和发布检查。

## 本地目录

- `artist-assets/inbox/`：投放新原始材料的入口，按 CV、bio、statement、portfolio、works、work-images、other 分类。
- `artist-assets/source-materials/`：页面导入后保存的原始 PDF、Word、图片和文本材料。
- `artist-assets/works/`：整理后的正式作品图片或申请用图片。
- `data/artist.sqlite`：本地数据库，保存材料索引、整理后的资料、机会、申请包和状态。
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

如果只用 Codex 自动化，可以不配置外部模型 API。项目内 AI 自动化需要在本机 `.env.local` 中配置自己的 DeepSeek、OpenAI、Gemini、Claude 或其他兼容接口 key。不要把 `.env.local` 或任何真实 key 提交到 Git。

## 常用检查

```bash
npm run lint
npm run typecheck
npm test
```

本地备份：

```bash
npm run backup
```

备份会写入 `backups/YYYY-MM-DDTHH-mm-ss/`，该目录只用于本机长期保存，不应提交到 Git。

## 安全边界

- 未经用户最终确认，不发送邮件、不提交网页表单、不付款、不处理验证码。
- 用户确认后，Codex 自动化可以继续执行投递步骤，并记录投递结果。
- 项目代码不保存第三方平台密码；涉及登录、验证码、付款或敏感授权时，需要用户介入。
