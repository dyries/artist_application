# Fix Log

This file records recurring bug fixes, error investigations, optimization passes, and verification results so project maintenance is not only preserved in chat history.

## 2026-05-19 18:08 CST

### Scope

- Clarified external API setup for local users and GitHub users.
- Updated UI wording to describe generic external API automation instead of naming one provider in public-facing text.
- Added a macOS local launcher that starts the app on `127.0.0.1:3000` and opens the browser.

### Issues Found

- Public UI copy overemphasized Codex and one external provider, which made the app look less provider-agnostic than the implementation.
- README and `.env.example` did not clearly tell GitHub users where to configure external APIs or how to choose among multiple API types.
- Application package cards displayed the full package path directly under the application number, which looked like a large identifier.

### Root Cause

- Existing copy predated the generic external API workflow and mixed provider-specific examples into user-facing panels.
- Application package display used raw `packagePath` as primary visible text.

### Changes

- Reworded header, sidebar, settings, README, automation docs, Codex workflow docs, and Codex automation export to use generic external API language.
- Updated `.env.example` to lead with an OpenAI-compatible gateway block and keep provider-specific examples.
- Collapsed application package file paths behind a “文件位置” disclosure and kept visible identifiers short.
- Added `启动本地项目.command`.

### Files Changed

- `.env.example`
- `README.md`
- `docs/automation.md`
- `docs/codex-workflow.md`
- `docs/fix-log.md`
- `generated/codex/automation-instructions.md`
- `src/app/components/Studio.tsx`
- `src/app/components/StudioChrome.tsx`
- `src/app/globals.css`
- `src/lib/codexWorkspace.ts`
- `启动本地项目.command`

### Verification

```bash
npm run typecheck
zsh -n 启动本地项目.command
```

### Remaining Notes

- `.env.local`, SQLite databases, user materials, and generated output remain ignored by Git and should not be pushed.

## 2026-05-19 14:28 CST

### Scope

- Added structured opportunity fee and tier preferences to the local app, project rules, project automation prompt, and Codex automation export.
- Refreshed the local generated Codex automation snapshot and instructions.

### Issues Found

- Fee acceptance rules existed only as default screening text, so users could not explicitly allow paid exhibitions/residencies or modest application fees.
- Opportunity level/tier preference was not represented as structured data, so automation could not reliably distinguish high-tier-only, balanced, or open search modes.

### Root Cause

- `artist_profile` stored application region, batch size, and submission approval mode, but not opportunity fee acceptance or opportunity tier preference.
- Codex and project automation instructions used fixed default cost language instead of reading a user-selected preference from the profile.

### Changes

- Added `opportunityFeePreference` with `conservative`, `application_fee_ok`, and `paid_ok`.
- Added `opportunityTierPreference` with `high_tier`, `balanced`, and `open`.
- Added database columns and fallback coercion for existing profiles.
- Added profile-page selectors and user-facing default labels.
- Synchronized rules across docs, generated Codex automation instructions, and the project-internal automation prompt.

### Files Changed

- `README.md`
- `docs/automation.md`
- `docs/codex-workflow.md`
- `docs/data-model.md`
- `docs/fix-log.md`
- `docs/rules.md`
- `src/app/components/Studio.tsx`
- `src/app/components/studioModel.ts`
- `src/lib/codexWorkspace.ts`
- `src/lib/db.ts`
- `src/lib/projectAutomation.ts`
- `src/lib/schemas.ts`
- `src/types/domain.ts`

### Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
curl -s -X POST http://localhost:3000/api/codex/context
```

Browser verification also confirmed the profile page shows the new fee and tier selectors with the expected defaults.

### Remaining Notes

- Generated files under `generated/codex/` are intentionally local outputs and remain ignored by Git.

## 2026-05-19 13:56 CST

### Scope

- Added a durable fix/error log policy for the project and Codex automation.
- Optimized artist data persistence and material statistics from the previous maintenance pass.

### Issues Found

- The project did not have a persistent place to record each bug fix, error, root cause, changed file list, and verification result.
- Saving artist data upserted works and CV entries but did not remove records that had been removed from the current form state, so stale records could reappear after refresh.
- Database row mapping used broad `any` types and trusted enum-like database strings directly.
- Material type counts in the UI repeatedly scanned the material list once per material category.

### Root Cause

- Maintenance outcomes were only visible through terminal output, Git diffs, or chat history.
- `saveArtistData` treated submitted works and CV entries as partial updates, not as the complete current form state.
- SQLite query results were mapped without typed row boundaries or defensive enum coercion.
- Material counts used `filter` inside a category loop instead of one accumulator pass.

### Changes

- Created this log as the canonical place for future fix and error records.
- Updated project maintenance rules so every bug fix or optimization must add or update this log.
- Added typed SQLite row mappings and enum fallback coercion.
- Synchronized saved works and CV entries with the current submitted payload.
- Changed material counts to a single-pass accumulator.

### Files Changed

- `docs/fix-log.md`
- `docs/maintenance.md`
- `docs/rules.md`
- `src/app/components/Studio.tsx`
- `src/lib/codexWorkspace.ts`
- `src/lib/db.ts`

### Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

All checks passed after the code changes.

### Remaining Notes

- Uploaded/material library records are intentionally not deleted during ordinary save because the UI reads a limited material page; deleting absent material rows there could remove older indexed files by accident.
