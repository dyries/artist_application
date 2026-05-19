# Maintenance Guide

## Version Control

- 默认分支使用 `main`。
- 只提交代码、文档、配置、目录占位文件和可公开示例。
- 不提交真实材料、数据库、生成申请包、最终提交文件、备份、`.env.local` 或第三方平台凭据。
- 每次规则变化都要同时更新 `docs/` 和 Codex 自动化说明模板。

## Validation

提交前运行：

```bash
npm run lint
npm run typecheck
npm test
```

`npm test` 会执行项目结构验证，确认关键目录、占位文件、规则文档、忽略规则和 package manifest 支撑仍然存在。

## Backup

运行：

```bash
npm run backup
```

备份内容包括：

- `data/`
- `artist-assets/`
- `generated/final-submissions/`

备份写入 `backups/YYYY-MM-DDTHH-mm-ss/`。备份目录只用于本机保存，不应提交到 Git。

## Release Checklist

- `.gitignore` 仍然排除私人材料和生成结果。
- `docs/rules.md`、`docs/automation.md` 和生成的 `generated/codex/automation-instructions.md` 没有规则冲突。
- 数据库结构变化已写入迁移。
- 新申请包会写 `package-manifest.json`。
- 用户可编辑审核文件，最终提交文件与审核文件分开命名。
