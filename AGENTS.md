# AGENTS.md

## Required Reading

Before changing this project, read `docs/rules.md`. It is the single complete source for product behavior, automation boundaries, portfolio quality, privacy, security, Figma implementation, and task completion requirements.

Before frontend changes, also read:

- `FRONTEND_STYLE_GUIDE.md`
- `UI_ACCEPTANCE_CHECKLIST.md`

## Execution Rules

- Inspect the existing structure and affected files before editing.
- Preserve existing business logic unless the task explicitly changes it.
- Reuse existing components and utilities; avoid unrelated rewrites and duplicate rules or code.
- Keep only two default user review nodes: opportunity selection and final submission-package approval.
- Automatically repair ordinary portfolio and application quality problems.
- Enforce complete artwork images as primary portfolio images; supporting images cannot replace available complete documentation.
- Never commit artist materials, portfolios, application packages, generated/test outputs, databases, environment files, credentials, or personal information.
- Add or update tests when behavior changes and run available checks.

## Mandatory Worklog

Every project change must append `WORKLOG.md` with:

- date/time
- task goal
- files changed
- what changed
- why it changed
- tests/checks run
- result
- issues found
- next steps

Run `npm run check:worklog` when available. A task is not complete until the worklog check passes.
