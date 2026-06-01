# Maintenance Guide

## Version Control

- 默认分支使用 `main`。
- 运行环境需要 Git、Node.js 20 或更新版本、npm。
- 可选增强依赖：Python 3、`pypdf`、`python-docx`、`reportlab`、macOS `textutil`、系统 `file` 命令。缺失时项目仍可运行，但材料提取或 DOCX/PDF 导出能力会降级。
- 只提交代码、文档、配置、目录占位文件和可公开示例。
- 不提交真实材料、数据库、生成申请包、最终提交文件、备份、`.env.local` 或第三方平台凭据。
- 每次规则变化都要同时更新 `docs/rules.md` 和 `src/lib/automationRules.ts`；Codex 自动化说明由共享规则模块生成。
- 每次报错排查、bug 修复、优化或验证结果都要记录到 `docs/fix-log.md`，至少包含时间、问题、根因、修改文件、验证命令和剩余风险。
- 每次修改完成后都要同步本地项目、Codex 自动化说明模板和 GitHub 远端仓库；推送后确认远端 `main` 指向最新提交。

## Validation

提交前运行：

```bash
npm run lint
npm run typecheck
npm test
```

`npm test` 会执行项目结构验证，确认关键目录、占位文件、规则文档、忽略规则和 package manifest 支撑仍然存在。

GitHub Actions 会在 push 和 pull request 上运行同一组检查：`npm ci`、`npm run lint`、`npm run typecheck`、`npm test`。如果本地检查和 CI 结果不一致，先以 CI 日志为准排查 Node 版本、缺失文件或平台差异。

## Backup

运行：

```bash
npm run backup
```

备份内容包括：

- `data/`
- `artist-assets/`
- `generated/final-submissions/`

备份写入 `backups/YYYY-MM-DDTHH-mm-ss/`。备份目录用于运行环境内的数据留存，不应提交到 Git。

## Release Checklist

- `.gitignore` 仍然排除私人材料和生成结果。
- `.github/workflows/checks.yml` 仍然运行 lint、typecheck 和项目结构验证。
- `docs/rules.md`、`docs/automation.md` 和 `src/lib/automationRules.ts` 没有规则冲突。
- `docs/fix-log.md` 已记录本次报错、修复、优化和验证结果。
- 数据库结构变化已写入迁移。
- 新申请包会写 `package-manifest.json`。
- 用户可编辑审核文件，最终提交文件与审核文件分开命名。
