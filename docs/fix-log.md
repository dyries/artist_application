# Fix Log

This file records recurring bug fixes, error investigations, optimization passes, and verification results so project maintenance is not only preserved in chat history.

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
