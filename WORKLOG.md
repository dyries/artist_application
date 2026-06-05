# WORKLOG

This file is the single canonical record for Codex work in this project.

It records every code change, project inspection, error investigation, bug fix, optimization, and test/check run, including entries migrated from the retired `docs/fix-log.md` and generated QA logs.

## Logging rule

For each task, add entries for:
- date and time in the section heading when known
- modified files
- inspections performed
- tests or checks run
- verification results
- known limitations or blockers

Use concise entries. Do not include secrets, private credentials, or client-facing application text that should stay external-material clean.

## 2026-05-19 Add all-rights-reserved repository license notice

### Scope

- Added an explicit repository license notice before making the GitHub project public.

### Issues Found

- The repository had no `LICENSE` file, which made reuse rights unclear once the project becomes public.

### Root Cause

- The project was initially maintained as a private/local workspace and did not need an explicit public-facing rights statement.

### Changes

- Added `LICENSE` with an all-rights-reserved notice.
- Added a short license section near the top of `README.md`.

### Files Changed

- `LICENSE`
- `README.md`
- `docs/fix-log.md`

### Verification

```bash
Not run; documentation-only change.
```

### Remaining Notes

- Public visibility still allows people to view and fork through GitHub UI behavior, but the repository does not grant reuse, redistribution, hosting, commercial use, or derivative-work rights.

## 2026-05-19 Security hardening for public GitHub/project deployment

### Scope

- Added deployment-time access protection for non-local hosts.
- Added public URL validation and DNS checks before server-side opportunity page fetching.
- Tightened material upload, extraction, and image metadata resource limits.
- Restricted application package image copying to approved project material directories.

### Issues Found

- The project was public on GitHub and needed a security pass before possible non-local use.
- API routes could read, write, delete, upload, scan, export, and run automation without authentication.
- User-provided opportunity URLs could be fetched by the server without network target restrictions.
- Material upload and extraction limits were loose for a public-facing app.
- Application package generation copied any model-suggested local `Image:` path that existed.

### Root Cause

- The app was originally designed as a localhost workspace and did not enforce deployment-time authentication or SSRF/path allowlists.
- Upload and parser limits were optimized for local artist materials rather than hostile public input.

### Changes

- Added middleware that allows localhost but requires Basic Auth or bearer token on non-local hosts.
- Restricted manual opportunity URLs to public `https://` targets and revalidates each redirect before fetching.
- Added DNS resolution checks to block localhost, private networks, link-local addresses, and internal IP targets.
- Added upload request total size limits, lower default extraction limits, bounded page fetch reads, and image pixel limits.
- Added a path allowlist before copying selected work images into generated packages.

### Files Changed

- `middleware.ts`
- `.env.example`
- `README.md`
- `src/lib/urlSecurity.ts`
- `src/lib/db.ts`
- `src/lib/opportunityPages.ts`
- `src/app/api/materials/upload/route.ts`
- `src/lib/fileMaterials.ts`
- `src/lib/package.ts`
- `docs/rules.md`
- `src/lib/codexWorkspace.ts`
- `package.json`
- `package-lock.json`

### Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev
```

### Remaining Notes

- `postcss` is pinned through npm overrides to avoid the unsafe `npm audit fix --force` downgrade path.
- Public deployments should set strong auth secrets and avoid exposing `.env.local`, SQLite databases, user materials, generated packages, or backups.

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

## 2026-05-22 00:00 CST

### Scope

- Hardened external-model automation output handling.
- Increased and parameterized public opportunity page fetching.
- Added repository CI checks and clearer onboarding/output documentation.
- Started a low-risk split of the main Studio component.

### Issues Found

- External model output was parsed with a TypeScript assertion instead of runtime validation.
- Opportunity fetching was hard-coded to 12 pages, 1MB, 15 seconds, and 5 redirects, which was too restrictive for larger open-call batches.
- Opportunity fetching ran sequentially, making larger batches unnecessarily slow.
- The repository did not have GitHub Actions for lint, typecheck, and project verification.
- README did not show a concise end-to-end workflow or generated package preview.
- `Studio.tsx` still carried too much UI surface in one file.
- Application package manifest recording happened inside package writing before an application id was available, then project automation recorded it again with the id.

### Root Cause

- Initial automation code relied on prompt instructions and TypeScript shapes rather than validating untrusted model JSON at runtime.
- Page fetch limits were defensive constants from an early implementation and were not exposed through environment configuration.
- The existing concurrency helper was not used for opportunity page refresh.
- Maintenance checks were local-only.
- Project documentation described capabilities but did not show the concrete generated artifact shape early enough.
- The workbench UI grew organically around one component.

### Changes

- Added `aiAutomationResponseSchema` and parse model output with Zod before writing opportunities or application packages.
- Raised default opportunity fetch limits to 100 pages, 5MB per page, 30 seconds, 8 redirects, 60000 stored characters, 12000 prompt characters, and 4 concurrent requests.
- Added `.env.local` knobs for opportunity fetch limits while keeping SSRF protections enforced.
- Added GitHub Actions checks for `npm ci`, `npm run lint`, `npm run typecheck`, and `npm test`.
- Added README workflow and generated package preview plus `docs/example-application-package.md`.
- Extracted the profile tab into `ProfilePanel`.
- Kept manifest database recording in project automation where the application id is available.

### Files Changed

- `.env.example`
- `.github/workflows/checks.yml`
- `README.md`
- `docs/automation.md`
- `docs/example-application-package.md`
- `docs/fix-log.md`
- `docs/maintenance.md`
- `scripts/verify-project.mjs`
- `src/app/components/ProfilePanel.tsx`
- `src/app/components/Studio.tsx`
- `src/lib/opportunityPages.ts`
- `src/lib/package.ts`
- `src/lib/projectAutomation.ts`
- `src/lib/schemas.ts`

### Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

All checks passed after the code and documentation changes.

### Remaining Notes

- Static server-side fetch still cannot solve JS-rendered pages, login, captcha, payments, or complex form submission. Those remain Codex browser or manual-review tasks.


This file records recurring bug fixes, error investigations, optimization passes, and verification results so project maintenance is not only preserved in chat history.

## 2026-05-22 11:52 CST

### Scope

- Reduced repeated rule and automation prose across docs, UI, and machine prompts.
- Added a shared machine-rule source for Codex instructions and external API prompts.

### Issues Found

- README, automation docs, Codex workflow docs, Studio settings, Codex workspace export, and project automation prompt repeated the same review, fee, tier, direct-apply, and safety rules.
- `src/lib/codexWorkspace.ts` and `src/lib/projectAutomation.ts` each hand-wrote overlapping rule text, making future drift likely.
- The settings page duplicated long-form rules that belong in documentation.

### Root Cause

- Human-readable rules and machine-readable prompt rules were maintained as separate prose blocks instead of being generated from a shared source.
- README and workflow docs had grown from entry points into full rule documents.

### Changes

- Added `src/lib/automationRules.ts` as the shared machine-rule module.
- Updated Codex workspace export and external API automation prompt generation to use the shared rules.
- Shortened README, `docs/automation.md`, and `docs/codex-workflow.md` into focused entry/workflow documents with links to `docs/rules.md`.
- Replaced the Studio settings page's long rule list with a current preference summary.
- Updated maintenance/rule docs and project verification to recognize the shared rule module.

### Files Changed

- `README.md`
- `docs/automation.md`
- `docs/codex-workflow.md`
- `docs/fix-log.md`
- `docs/maintenance.md`
- `docs/rules.md`
- `scripts/verify-project.mjs`
- `src/app/components/Studio.tsx`
- `src/app/components/StudioChrome.tsx`
- `src/lib/automationRules.ts`
- `src/lib/codexWorkspace.ts`
- `src/lib/projectAutomation.ts`

### Verification

```bash
npm run typecheck
npm test
npm run lint
```

All checks passed.

### Remaining Notes

- `docs/rules.md` remains the human-readable rule source. `src/lib/automationRules.ts` is the machine-readable source used to generate Codex and external API instructions.

## 2026-05-26 - Application automation boundary and quality refactor

### Problem

- Project automation could prepare packages before the user selected opportunities.
- Generated package files mixed internal reasoning, user review, and external submission text.
- External-facing files had no automatic sanitizer for internal workflow words, AI traces, placeholders, or negative missing-information terms.
- Portfolio rules were prompt-level guidance without a preparation/output quality gate.
- Test/mock runs were not clearly isolated from real application records and package state.

### Root Cause

- The workflow had only coarse opportunity statuses and a single package writer.
- The database did not record run mode or boundary model for application/package records.
- Tests focused on repository structure rather than application-quality invariants.

### Changes

- Added `src/lib/outputSanitizer.ts`, `src/lib/languageReviewCheck.ts`, `src/lib/missingInfoHandler.ts`, `src/lib/portfolioQualityCheck.ts`, and `src/lib/qualityChecks.ts`.
- Reworked `src/lib/package.ts` to write `internal-notes/`, `user-review/`, and `external-submission/` directories with manifest version 2.
- Added opportunity statuses for recommendation, user selection, quality blocking, final review readiness, and submission approval.
- Added `run_mode` and `boundary_model` database fields.
- Added `/api/opportunities/[id]` selection endpoint and UI buttons for “选择申请 / 暂不申请”.
- Changed project automation to prepare packages only for user-selected/preparing opportunities and isolate `test`/`mock` output.
- Added policy docs and audit report for application rules, portfolio generation, review, submission boundaries, and test-run isolation.
- Added static tests for boundaries, sanitizer coverage, portfolio gates, and test/mock isolation.

### Validation

```bash
npm run typecheck
npm test
npm run test:structure
npm run lint
npm run build
```

All commands passed.

### Remaining Risk

- PDF portfolio visual quality still benefits from a rendered visual QA step for each real generated portfolio.
- Deep live portfolio design research is best handled by Codex/browser; the in-app external model records references and applies rules but cannot independently inspect arbitrary visual layouts without fetched context.

## 2026-05-26 - Discovery, portfolio rendering, and final review node completion

### Problem

- Project automation still relied on existing/manual opportunity records instead of having an in-app public opportunity discovery step.
- Portfolio checks were text/structure gates but did not create a portfolio layout artifact or visual/structure report.
- The second user review node existed in rules/manifest but not as an app API/UI action.

### Root Cause

- Opportunity discovery, portfolio rendering, file-size checks, and final package decision handling were not separate application services.

### Changes

- Added `src/lib/opportunitySearch.ts` to read configurable public opportunity source pages, extract likely open call / residency / exhibition / grant links, and write them only in real run mode.
- Added `src/lib/portfolioRenderer.ts` to create restrained `external-submission/portfolio.html`, best-effort `portfolio.pdf`, and internal `portfolio-visual-check.json`.
- Added `src/lib/fileQualityCheck.ts` and integrated external file format/size checks into package generation.
- Added `/api/applications/[id]` for `approve_final_submission_package` and `request_revision`.
- Updated the submissions UI with “批准最终提交包” and “需要返工”.
- Cleaned older one-off generation scripts so they no longer write obsolete `drafted` / `ready_final_review` states or `final-candidate` output names.
- Updated tests, README, automation docs, data model, review policy, and example package docs.

### Validation

```bash
npm run typecheck
npm test
npm run test:structure
```

All commands passed.

### Remaining Risk

- PDF portfolio rendering is best-effort and depends on Playwright availability. The HTML portfolio and internal visual report are still produced when PDF rendering fails.

## 2026-05-26 12:15 CST

### Scope

- Cleaned public-facing Goethe application files after the user flagged unprofessional and AI-like wording.
- Added durable automation rules to prevent missing-link placeholders, opportunity-label portfolio language, and public-facing draft placeholders from being regenerated.

### Issues Found

- CV output stated `No website / Instagram`, which reads as a weakness rather than a necessary fact.
- Portfolio cover/statement exposed packaging language such as `for FILE NOT FOUND` and stated the portfolio was selected for a specific open call.
- Some public-facing captions and older helper scripts still contained `to be confirmed` / `Details to be confirmed` placeholders.
- Existing automation rules said to tailor portfolios to opportunities, but did not clearly separate internal tailoring logic from final public-facing portfolio language.

### Root Cause

- Earlier generation scripts mixed internal application rationale with upload-facing portfolio and CV text.
- Missing facts were represented as visible placeholders instead of being omitted from final files and tracked in internal notes.
- Automation instructions lacked a specific public-facing tone rule for CVs, portfolios, captions, form answers, and upload files.

### Changes

- Regenerated the Goethe CV without website/Instagram absence language.
- Regenerated the Goethe portfolio with neutral `Selected Works` wording and no visible Goethe/FILE NOT FOUND/CMAA selection rationale.
- Removed public-facing `to be confirmed` dimension placeholders from current portfolio captions.
- Added public-facing tone/package-cleanup rules to `docs/rules.md`, `src/lib/automationRules.ts`, `generated/codex/automation-instructions.md`, and `generated/codex/artist-snapshot.json`.
- Updated older Goethe helper scripts so reruns do not reintroduce the same wording.

### Files Changed

- `docs/fix-log.md`
- `docs/rules.md`
- `src/lib/automationRules.ts`
- `generated/codex/automation-instructions.md`
- `generated/codex/artist-snapshot.json`
- `scripts/generate_goethe_portfolio_v2_2026_05_26.py`
- `scripts/make_goethe_final_candidate_2026_05_26.py`
- `scripts/update_user_info_and_generate_portfolio_2026_05_25.py`
- `scripts/finalize_goethe_review_package_2026_05_26.py`
- `generated/applications/2026-05-25/residency-goethe-file-not-found-cmaa/*`

### Verification

```bash
rg -n "No website|No Instagram|Website / Instagram|Instagram: None|website: None|N/A|to be confirmed|details to be confirmed|This portfolio is selected|for FILE NOT FOUND|for Goethe|Goethe application|selected for the|selected for this|proposed research|application-specific|ready-to-copy|Ready-to-Copy|Final Candidate|final candidate|submission image for|draft for|Draft for|placeholder" generated/applications/2026-05-25/residency-goethe-file-not-found-cmaa generated/codex docs/rules.md src/lib/automationRules.ts scripts/generate_goethe_portfolio_v2_2026_05_26.py scripts/make_goethe_final_candidate_2026_05_26.py scripts/update_user_info_and_generate_portfolio_2026_05_25.py scripts/finalize_goethe_review_package_2026_05_26.py -S
python3 scripts/generate_goethe_portfolio_v2_2026_05_26.py
python3 scripts/make_goethe_final_candidate_2026_05_26.py
```

Visual spot checks were performed on the regenerated portfolio cover, portfolio statement page, and CV page.

### Remaining Notes

- The `rg` verification intentionally still matches the new rules themselves and internal notes, because the rules quote the prohibited phrases as examples. Those phrases should not appear in upload-ready CV/portfolio/form text.
- Exact artwork dimensions should be added only after the artist confirms them; until then, final-facing captions omit dimensions rather than showing placeholders.

## 2026-06-01 00:00 CST

### Scope

- Refactored portfolio generation toward automatic 20-page planning, classified visual gate issues, and an auto-repair loop.

### Changes

- Added portfolio constraints, image roles, visual gate issue classifications, auto-repair log, and variant types.
- Replaced the 8-work fallback with `buildAutomaticPortfolioPlan`, defaulting to `targetPages: 20`, `minimumPages: 16`, and `maximumPages: 24` unless opportunity text overrides the page count.
- Added `generatePortfolioWithAutoRepair`, which renders, classifies issues, repairs ordinary problems for up to 3 rounds, writes `portfolio-auto-repair-log.json`, and lets only blocking issues decide `quality_blocked`.
- Changed portfolio image copying to stable unique hashed filenames so duplicate basenames from different folders cannot overwrite each other.
- Updated user-review copy so the artist sees an automated portfolio summary and final confirmation prompt instead of being told to handle ordinary internal issues.
- Updated project automation prompts and schemas so the AI acts as a professional portfolio editor and emits portfolio constraints, variants, and repair intent.
- Materialized opportunity-specific variants instead of only recording planned variants: short portfolio PDF/HTML, individual upload-image folder, and combined application PDF/HTML.
- Updated machine-readable automation rules to require auto-repair for ordinary portfolio problems instead of sending image/layout failures straight to `quality_blocked`.
- Added explicit `selectedImages` / `excludedImages` schema and package inputs, plus visual-gate classifications and repair handlers for long captions, generic statements, dense series grids, and duplicate images.
- Split portfolio preparation/output quality checks into blocking issues and warnings, so missing legacy portfolio references, limited design references, dense text, and cliche language no longer force `quality_blocked` after the auto-repair path exists.
- Improved automatic planning so existing portfolio source text biases work ordering and, when work records lack images, image files from works/source-materials/inbox can become fallback portfolio candidates with internal quality risks.
- Tightened variant and quality behavior: combined PDFs now include portfolio pages as well as external text files, external file-size problems are recorded as warnings rather than user-blocking issues, existing portfolio title matching is normalized, and image scoring uses available resolution/aspect/file-size metadata.
- Added explicit final portfolio result/manifest fields for selected images, excluded images, missing metadata, and quality risks, and expanded `materialsActuallyUsed` to include portfolio image paths actually used.
- Added a no-browser PDF fallback so `portfolio.pdf`, short portfolio PDFs, and combined PDFs are still generated when Playwright is installed but Chromium is unavailable.

### Files Changed

- `src/types/domain.ts`
- `src/lib/schemas.ts`
- `src/lib/package.ts`
- `src/lib/portfolioRenderer.ts`
- `src/lib/projectAutomation.ts`
- `src/lib/automationRules.ts`
- `docs/portfolio_generation_rules.md`
- `docs/rules.md`
- `docs/fix-log.md`
- `README.md`
- `tests/portfolio-generation.test.mjs`

### Verification

```bash
npm run typecheck
```

Full verification continues with lint, tests, structure check, build, and `npm run check`.

## 2026-06-01 15:46 CST

### Scope

- Reworked portfolio generation from free-text parsing toward a structured, fail-closed application portfolio pipeline.

### Issues Found

- Portfolio rendering depended on `selectedWorks` text and `Image:` regex parsing.
- Missing or disallowed images could be skipped while still producing external portfolio output.
- The cover could inherit opportunity/mock-review framing instead of reading as a real artist portfolio.
- Quality checks did not persist a source audit or structured page plan and did not strongly gate page count, file size, image assets, or forbidden terms.

### Root Cause

- Portfolio planning, image validation, rendering, and visual QA were collapsed into a thin renderer path.
- AI schema only asked for loose portfolio text and selected works rather than a structured plan with image roles and quality risks.

### Changes

- Added `PortfolioSourceAudit`, `PortfolioPlan`, page types, and image-role domain types.
- Added schema fields for `portfolioPlan`, `portfolioSourceAudit`, `selectedWorksStructured`, excluded images, missing metadata, and portfolio risks.
- Updated package writing to emit `internal-notes/portfolio-source-audit.json` and `internal-notes/portfolio-plan.json`.
- Replaced selectedWorks parsing in the renderer with PortfolioPlan rendering for cover, statement, full work, detail, installation, series grid, contact, and selected-work-list pages.
- Changed portfolio image copying to validate allowed roots, sharp metadata, copy success, optimization, and too-small-image risk before approval.
- Added a visual gate for PDF render status, forbidden external terms, planned image assets, page count, file size, reference count, caption readability, and basic rendered DOM image visibility.
- Synchronized portfolio rules in docs and automation machine rules, and added structural tests for the new pipeline.

### Files Changed

- `docs/fix-log.md`
- `docs/portfolio_generation_rules.md`
- `docs/rules.md`
- `src/lib/automationRules.ts`
- `src/lib/package.ts`
- `src/lib/portfolioQualityCheck.ts`
- `src/lib/portfolioRenderer.ts`
- `src/lib/projectAutomation.ts`
- `src/lib/qualityChecks.ts`
- `src/lib/schemas.ts`
- `src/types/domain.ts`
- `tests/portfolio-generation.test.mjs`

### Verification

```bash
npm run typecheck
npm test
```

`npm run typecheck` and `npm test` passed after fixing TypeScript union narrowing issues.

### Remaining Notes

- The visual gate uses Playwright HTML/PDF rendering and DOM checks. A deeper pixel-level PDF raster analysis can still be added later if packages need stricter print-production QA.

## 2026-06-02 00:00 CST

### Scope

- Continued the portfolio generation refactor toward a PDF-first, automatic artist portfolio designer/editor.

### Issues Found

- The renderer still lacked the full visual/aesthetic report fields required for readiness decisions.
- Image dimensions and quality metadata were collected in isolated places but not recorded as a planning artifact or used consistently for layout/theme choices.
- Fallback text PDFs could be mistaken for professional portfolio PDFs.
- Live layout research could spend too long probing many default references.

### Root Cause

- The visual gate reported only a nested diagnostic subset rather than top-level layout counts, repeated runs, scores, missing images, and caption diagnostics.
- Portfolio planning used filename and size scoring but did not have a reusable `sharp` analysis module.
- The PDF renderer returned a path for both Playwright and fallback PDFs without recording professional readiness.
- Research fetching was uncapped.

### Changes

- Added `src/lib/portfolioImageAnalysis.ts` to analyze image dimensions, orientation, brightness, dominant color, quality risks, and recommended roles with `sharp`.
- Stored image analyses in `portfolio-source-audit.json` and used them in ranking, theme selection, and small/panoramic image layout decisions.
- Extended `portfolio-visual-check.json` with layout strategy counts, theme counts, repeated layout runs, sparse pages, white-page ratio, missing/small images, caption issues, aesthetic score, professional PDF score, and fallback-PDF status.
- Made unresolved low aesthetic/professional PDF scores, fallback PDFs, page-count failures, missing images, and forbidden language block final readiness after repair.
- Capped live portfolio research fetches and screenshots while still honoring configured HTTPS research sources first.
- Added `npm run test:portfolio` and strengthened behavior tests for image analysis and visual report fields.
- Fixed duplicate-image handling so normal overview-to-primary/detail reuse is allowed while excessive repeated full/non-overview use is still repaired.
- Added upload-only opportunity constraints so individual-image-only calls do not force the default 20-page PDF rule.
- Added fast planning behavior tests for default page constraints, 10-page opportunity limits, upload-only calls, and enough-material expansion toward 20 pages.
- Corrected the caption-density gate so formal statement and selected-works-list pages are not misclassified as dense captions; ready packages now show the visual/aesthetic gate as passed when no actual gate issues remain.
- Removed `Test Preview`, `Web preview`, and browser-preview language from the public `/portfolio-test` surface so the visible portfolio example does not contradict formal PDF-first portfolio rules.
- Added Playwright portfolio page screenshots under `internal-notes/portfolio-page-screenshots/` and recorded their paths in `portfolio-visual-check.json` for default portfolio visual/aesthetic review.
- Fixed portfolio output quality counting so `single_work_full_page` image paths count as selected image paths and do not produce false “no selected image paths” issues.
- Wired the final portfolio visual/aesthetic report into `runApplicationQualityChecks` so `quality-report.json` fails when the final portfolio visual gate fails, matching package readiness.
- Added an integration assertion that non-`quiet_white` portfolio screenshots are not pure white, exercising the non-white background preservation path alongside Playwright `printBackground: true`.

### Files Changed

- `docs/fix-log.md`
- `docs/portfolio_generation_rules.md`
- `package.json`
- `src/lib/package.ts`
- `src/lib/portfolioImageAnalysis.ts`
- `src/lib/portfolioRenderer.ts`
- `src/lib/portfolioQualityCheck.ts`
- `src/lib/qualityChecks.ts`
- `src/lib/schemas.ts`
- `src/types/domain.ts`
- `src/app/portfolio-test/page.tsx`
- `tests/application-boundaries.test.mjs`
- `tests/package-behavior-runner.mjs`
- `tests/portfolio-planning-behavior.test.mjs`
- `tests/portfolio-planning-runner.mjs`
- `tests/portfolio-generation.test.mjs`
- `tests/portfolio-quality-behavior.test.mjs`
- `tests/portfolio-quality-runner.mjs`

### Verification

```bash
npm run lint
npm run typecheck
npm run test:portfolio
node --test tests/package-behavior.test.mjs
npm run check
```

Rendered `generated/test-runs/applications/992001-probe-many-default/external-submission/portfolio.pdf` to PNG snapshots with ImageMagick and visually checked cover, statement, project opener, image grid, selected works list, and contact pages for PDF-first appearance, non-white theme/backgrounds, page numbering, and absence of overlap/browser-preview language.

## 2026-06-02 00:30 CST

### Scope

- Removed obsolete one-off automation scripts from the active project tree.

### Issues Found

- Historical Goethe and weekly-opportunity Python scripts from 2026-05-25 and 2026-05-26 still lived in `scripts/` even though the current application flow now runs through Next API routes, `src/lib/projectAutomation.ts`, and `src/lib/package.ts`.
- The scripts were not referenced by `package.json`, API routes, tests, or the current app UI, but their presence made the repository look as if old application-specific rules were still active.

### Changes

- Deleted the retired Goethe/weekly one-off Python scripts from `scripts/`.
- Kept the rule documents because they are still linked from `README.md`, used by structure tests, and act as current policy references rather than dead code.
- Kept `scripts/verify-project.mjs` and `scripts/backup-workspace.mjs` as the only maintained script entry points.
- Clarified in `README.md` that specialized rule documents are current policy references, not old versions.

### Files Changed

- `docs/fix-log.md`
- `README.md`
- `scripts/finalize_goethe_review_package_2026_05_26.py`
- `scripts/generate_goethe_portfolio_v2_2026_05_26.py`
- `scripts/generate_weekly_artist_automation_2026_05_25.py`
- `scripts/make_goethe_final_candidate_2026_05_26.py`
- `scripts/prepare_goethe_eod_packages_2026_05_25.py`
- `scripts/update_user_info_and_generate_portfolio_2026_05_25.py`

### Verification

```bash
rg -n "finalize_goethe_review_package|generate_goethe_portfolio_v2|generate_weekly_artist_automation|make_goethe_final_candidate|prepare_goethe_eod_packages|update_user_info_and_generate_portfolio" --glob '!node_modules/**' --glob '!.next/**' --glob '!docs/fix-log.md'
```

## 2026-06-03 13:15 CST

### Scope

- Converted the app flow from a manual multi-run workflow into a two-review workflow in code.
- The first review now batches opportunity choices and automatically continues into package preparation.
- Final package revision requests now automatically re-enter package preparation instead of stopping for another manual automation run.

### Issues Found

- The product rules said the user should review only twice, but the UI still required manual follow-up actions after the first review.
- Each opportunity had individual select / not-select buttons, so the first review was fragmented across many actions.
- After selecting opportunities, the user still had to go to automation settings and manually run project automation again before packages were produced.
- A final package revision only changed status to `quality_blocked`; it did not automatically continue into the repair/preparation loop.

### Root Cause

- `runProjectAutomation` only had one full-run mode that mixed discovery, page refresh, opportunity verification, and package preparation.
- Opportunity selection was implemented as a simple status update endpoint, not as the first review node of an end-to-end state machine.
- The final package decision endpoint updated status but did not call package preparation again for revision.

### Changes

- Added `runProjectAutomation({ phase: "prepare-selected" })` so the app can skip discovery and continue directly with selected/preparing/quality-blocked opportunities.
- Added `POST /api/opportunities/review` to submit the first review in one request, mark selected opportunities as `selected_by_user`, mark unselected review candidates as `not_selected`, and immediately run selected-opportunity package preparation.
- Updated the opportunities UI to use checkboxes plus a single “完成第一次审核并自动制包” action.
- Updated final package revision handling to automatically run the selected-opportunity preparation phase again.
- Synchronized human and machine rules to state that first-review completion and final-package revision both auto-continue without adding extra user review nodes.

### Files Changed

- `src/lib/projectAutomation.ts`
- `src/app/api/opportunities/review/route.ts`
- `src/app/api/applications/[id]/route.ts`
- `src/app/components/Studio.tsx`
- `src/app/components/StudioPanels.tsx`
- `src/app/components/studioTypes.ts`
- `src/app/globals.css`
- `src/lib/automationRules.ts`
- `docs/rules.md`
- `docs/fix-log.md`

### Verification

```bash
npm run typecheck
npm run lint
npm run test:structure
node --test tests/package-behavior.test.mjs
npm run build
```

`npm test` was also started and 21 tests passed before the long package behavior child process was manually stopped at about 180 seconds. The same package behavior test then passed when run alone, completing in about 190 seconds.

### Remaining Notes

- The fully automatic package-preparation path still requires a configured external model API key in `.env.local`; without it, the first-review API returns the existing provider configuration error.
- The app still pauses before payment, login, captcha, legal/privacy-sensitive actions, and irreversible external submission.

## 2026-06-05 - Artist application end-to-end QA log

Run date: 2026-06-05
Run mode: `ARTIST_STUDIO_RUN_MODE=test`
Workspace: `/Users/chenyu/Desktop/艺术家`

## Scope

This QA run tested the repository end-to-end in isolated test mode only.

Boundaries followed:

- No real credentials.
- No real artist data.
- No real submission opportunities.
- No emails sent.
- No forms submitted.
- No payments, logins, or captcha bypass.
- Generated package outputs were written under `generated/test-runs/`.
- No code changes were made.

## Static Inspection

Read and checked:

- `README.md`
- `package.json`
- `docs/codex-workflow.md`
- `docs/test_run_policy.md`
- `docs/portfolio_generation_rules.md`
- `docs/application_rules.md`
- `docs/submission_boundary_rules.md`
- `docs/example-application-package.md`
- `docs/rules.md`

Relevant scripts from `package.json`:

- `dev`: `next dev`
- `build`: `next build`
- `start`: `next start`
- `lint`: `eslint .`
- `typecheck`: `tsc --noEmit`
- `test`: `node --test tests/*.test.mjs`
- `test:portfolio`: `node --test tests/portfolio*.test.mjs`
- `test:structure`: `node scripts/verify-project.mjs`
- `check`: `npm run lint && npm run typecheck && npm run test && npm run test:structure && npm run test:portfolio && npm run build`
- `backup`: `node scripts/backup-workspace.mjs`

Dependencies verified from `package.json`:

- `better-sqlite3`
- `next`
- `playwright`
- `react`
- `react-dom`
- `sharp`
- `zod`
- TypeScript, ESLint, Next ESLint config, React/Node types as dev dependencies.

Initial git status:

```text
clean working tree
```

## Install, Lint, Typecheck

Command:

```bash
ARTIST_STUDIO_RUN_MODE=test npm install
```

Result:

```text
added 1 package, and audited 345 packages in 2s
141 packages are looking for funding
found 0 vulnerabilities
```

Status: pass

Command:

```bash
ARTIST_STUDIO_RUN_MODE=test npm run lint
```

Result:

```text
> artist-application-studio@0.1.0 lint
> eslint .
```

Status: pass

Command:

```bash
ARTIST_STUDIO_RUN_MODE=test npm run typecheck
```

Result:

```text
> artist-application-studio@0.1.0 typecheck
> tsc --noEmit
```

Status: pass

## Automated Checks Before Generation

Command:

```bash
ARTIST_STUDIO_RUN_MODE=test npm test
```

Result:

```text
tests 22
pass 22
fail 0
cancelled 0
skipped 0
todo 0
duration_ms 188723.639458
```

Notable slow test:

```text
writeApplicationPackage produces automated portfolio artifacts from real inputs (188654.12425ms)
```

Status: pass

Command:

```bash
ARTIST_STUDIO_RUN_MODE=test npm run test:structure
```

Result:

```text
Project structure verification passed.
```

Status: pass

Command:

```bash
ARTIST_STUDIO_RUN_MODE=test npm run test:portfolio
```

Result:

```text
tests 9
pass 9
fail 0
cancelled 0
skipped 0
todo 0
duration_ms 183.6645
```

Status: pass

Command:

```bash
ARTIST_STUDIO_RUN_MODE=test npm run build
```

Result summary:

```text
Next.js 15.5.18
Compiled successfully
Generated static pages (12/12)
```

Status: pass

Command:

```bash
ARTIST_STUDIO_RUN_MODE=test npm run check
```

Result summary:

```text
lint: pass
typecheck: pass
test: pass, 22/22
test:structure: pass
test:portfolio: pass, 9/9
build: pass
```

Status: pass

## Fake Data Setup

Created fake QA data:

- `/Users/chenyu/Desktop/艺术家/generated/test-runs/qa-e2e/fake-artist-profile.json`
- `/Users/chenyu/Desktop/艺术家/generated/test-runs/qa-e2e/fake-opportunity.json`
- `/Users/chenyu/Desktop/艺术家/generated/test-runs/qa-e2e/fake-works.json`
- `/Users/chenyu/Desktop/艺术家/generated/test-runs/qa-e2e/fake-works-three-groups.json`
- `/Users/chenyu/Desktop/艺术家/generated/test-runs/qa-e2e/selected-works-index.txt`
- `/Users/chenyu/Desktop/艺术家/generated/test-runs/qa-e2e/statement.txt`

Created fake placeholder artwork images:

- Directory: `/Users/chenyu/Desktop/艺术家/artist-assets/works/qa-e2e-fixture/`
- Image count: 12
- Initial groups: `Paper Observatory`, `Night Archive`
- Later balanced test groups: `Paper Observatory`, `Night Archive`, `Surface Index`

## Package Generation Attempts

Generation used the repository package writer:

- Function: `writeApplicationPackage`
- Loader: `node --experimental-strip-types --loader ./tests/ts-esm-loader.mjs`
- Run mode: `test`

Node warnings during generation:

```text
ExperimentalWarning: `--experimental-loader` may be removed in the future
MODULE_TYPELESS_PACKAGE_JSON Warning: Module type of src/lib/package.ts is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected.
```

These warnings did not stop execution.

### Attempt 1

Package:

```text
/Users/chenyu/Desktop/艺术家/generated/test-runs/applications/880001-qa-public-residency-open-call
```

Result:

```json
{
  "status": "quality_blocked",
  "qualityPassed": false,
  "portfolioPageCount": 10,
  "readinessPassed": false
}
```

Readiness issues:

```text
Application quality checks did not pass.
Portfolio visual gate did not pass.
Portfolio blocked: Auto-repair did not resolve required portfolio quality issue: Portfolio has 10 pages, below minimum 16.
Portfolio blocked: Auto-repair did not resolve required portfolio quality issue: Portfolio did not pass project diversity, page rhythm, or layout strategy checks.
Portfolio blocked: Auto-repair did not resolve required portfolio quality issue: Portfolio professional PDF score is 80, below required 85.
```

Repair log summary:

```json
{
  "finalStatus": "blocked",
  "rounds": [
    {
      "round": 1,
      "repairs": ["Removed duplicate image pages from the PortfolioPlan."],
      "pageCountBefore": 16,
      "pageCountAfter": 10
    },
    {
      "round": 2,
      "repairs": ["Expanded portfolio from 10 to 12 pages with detail/context/list pages."],
      "pageCountBefore": 10,
      "pageCountAfter": 12
    },
    {
      "round": 3,
      "repairs": [
        "Expanded portfolio from 12 to 12 pages with detail/context/list pages.",
        "Removed duplicate image pages from the PortfolioPlan."
      ],
      "pageCountBefore": 12,
      "pageCountAfter": 10
    }
  ]
}
```

### Attempt 2

Package:

```text
/Users/chenyu/Desktop/艺术家/generated/test-runs/applications/880002-qa-planned-residency-open-call
```

Result:

```json
{
  "status": "quality_blocked",
  "qualityPassed": false,
  "portfolioPageCount": 20,
  "readinessPassed": false
}
```

Readiness issues:

```text
Application quality checks did not pass.
Portfolio visual gate did not pass.
Portfolio blocked: Auto-repair did not resolve required portfolio quality issue: Portfolio did not pass project diversity, page rhythm, or layout strategy checks.
```

Visual check summary:

```json
{
  "passed": false,
  "pageCount": 20,
  "aestheticScore": 100,
  "professionalPdfScore": 100,
  "autoFixableIssues": [
    {
      "code": "curatorial_gate_failed",
      "message": "Portfolio did not pass project diversity, page rhythm, or layout strategy checks."
    }
  ]
}
```

Curatorial summary in saved plan:

```json
{
  "projectGroupCount": 3,
  "dominantProjectGroup": "Paper Observatory",
  "dominantProjectPageRatio": 0.4375,
  "passedDiversityGate": false
}
```

Repair log summary:

```json
{
  "finalStatus": "blocked",
  "rounds": [
    {
      "round": 1,
      "repairs": [],
      "pageCountBefore": 20,
      "pageCountAfter": 20
    },
    {
      "round": 2,
      "repairs": [],
      "pageCountBefore": 20,
      "pageCountAfter": 20
    },
    {
      "round": 3,
      "repairs": [],
      "pageCountBefore": 20,
      "pageCountAfter": 20
    }
  ]
}
```

### Attempt 3

Package:

```text
/Users/chenyu/Desktop/艺术家/generated/test-runs/applications/880003-qa-balanced-residency-open-call
```

Result:

```json
{
  "status": "quality_blocked",
  "qualityPassed": false,
  "portfolioPageCount": 10,
  "readinessPassed": false
}
```

Readiness issues:

```text
Application quality checks did not pass.
Portfolio visual gate did not pass.
Portfolio blocked: Auto-repair did not resolve required portfolio quality issue: Portfolio has 10 pages, below minimum 16.
Portfolio blocked: Auto-repair did not resolve required portfolio quality issue: Portfolio professional PDF score is 80, below required 85.
```

Visual check summary:

```json
{
  "passed": false,
  "pageCount": 10,
  "aestheticScore": 100,
  "professionalPdfScore": 80,
  "autoFixableIssues": [
    {
      "code": "page_count_too_low",
      "message": "Portfolio has 10 pages, below minimum 16."
    },
    {
      "code": "professional_pdf_score_too_low",
      "message": "Portfolio professional PDF score is 80, below required 85."
    }
  ]
}
```

Repair log summary:

```json
{
  "finalStatus": "blocked",
  "rounds": [
    {
      "round": 1,
      "repairsApplied": [
        "Removed duplicate image pages from the PortfolioPlan."
      ],
      "pageCountBefore": 16,
      "pageCountAfter": 11
    },
    {
      "round": 2,
      "repairsApplied": [
        "Expanded portfolio from 11 to 15 pages with detail/context/list pages."
      ],
      "pageCountBefore": 11,
      "pageCountAfter": 15
    },
    {
      "round": 3,
      "repairsApplied": [
        "Expanded portfolio from 15 to 15 pages with detail/context/list pages.",
        "Rebuilt PortfolioPlan by project group with varied layout strategies.",
        "Removed duplicate image pages from the PortfolioPlan."
      ],
      "pageCountBefore": 15,
      "pageCountAfter": 10
    }
  ]
}
```

PDF page marker count:

```text
10
```

`pypdf` was not installed:

```text
ModuleNotFoundError: No module named 'pypdf'
```

Fallback PDF page count used raw `/Type /Page` marker count.

## Artifact Verification For Latest Package

Latest package checked:

```text
/Users/chenyu/Desktop/艺术家/generated/test-runs/applications/880003-qa-balanced-residency-open-call
```

Required internal files:

```text
internal-notes/portfolio-source-audit.json
internal-notes/portfolio-plan.json
internal-notes/portfolio-visual-check.json
internal-notes/portfolio-auto-repair-log.json
internal-notes/portfolio-layout-research.json
internal-notes/portfolio-layout-research.md
internal-notes/quality-report.json
internal-notes/package-readiness-check.json
internal-notes/file-quality-check.json
internal-notes/internal-issues.md
```

Status: all present

Required user-review files:

```text
user-review/机会与风险-中文审核.md
user-review/最终提交前检查清单-中文.md
user-review/英文正式材料中文说明.md
user-review/application-package.pdf
user-review/application-package.docx
```

Status: all present

Chinese review check:

```text
Chinese characters detected in user-review materials.
```

Status: pass

Required external files:

```text
external-submission/portfolio.pdf
external-submission/portfolio.html
external-submission/application-answers-en.md
external-submission/bio-en.md
external-submission/statement-en.md
external-submission/cv.md
external-submission/email-en.md
external-submission/file-checklist.md
```

Status: all present

External leakage scan:

```text
external-submission/portfolio.html: qa-artist@example.test
external-submission/cv.md: Contact: qa-artist@example.test | https://example.com/qa-artist
```

Status: fail for requested no `test` wording leak rule.

Note: the hits came from the fake `.test` email/domain, not internal workflow text.

Layout verification for latest package:

```json
{
  "cover": true,
  "statement": true,
  "projectDividers": true,
  "grids": true,
  "singleImagePages": false,
  "detailPages": false,
  "mixedImageText": false,
  "selectedWorks": true,
  "contactCvSummary": true
}
```

Status: fail because final repaired plan removed single-image, detail, and mixed image/text pages.

## Post-Generation Check

Command:

```bash
ARTIST_STUDIO_RUN_MODE=test npm run check
```

Result summary:

```text
lint: pass
typecheck: pass
test: pass, 22/22
test:structure: pass
test:portfolio: pass, 9/9
build: pass
```

Status: pass

## Root Cause Notes

Likely responsible files:

- `src/lib/package.ts`
- `src/lib/portfolioRenderer.ts`

Observed behavior:

- `normalizePortfolioPlan()` runs `repairCuratorialPlan()` even when an explicit structured `PortfolioPlan` is supplied.
- `repairCuratorialPlan()` rebuilds project-based image pages.
- `buildProjectBasedImagePages()` reuses top works across overview, installation/detail, full-page, and spread pages.
- `portfolioRenderer.ts` correctly flags excessive duplicate image usage.
- `repairPortfolioPlan()` then applies `removeDuplicateImagePages()`.
- Duplicate removal deletes image-bearing pages.
- Expansion does not reliably recover to the required 16-24 page range.
- Final package remains `quality_blocked`.

The failure is not only fake data. The repair loop has conflicting goals:

1. expand toward 20 pages,
2. rebuild by project group,
3. remove duplicate image uses,
4. preserve page count and layout diversity.

In the tested path, step 3 collapses the page count and removes required layout types.

## Final QA Summary

Static analysis: pass

Automated tests: pass

Portfolio generation: fail

Application package generation: partial pass, but final package is `quality_blocked`

Internal notes: pass

User review: pass

External submission: fail

Primary failures:

- generated portfolio is 10 pages, not around 20 pages;
- final repaired portfolio lacks required layout strategies;
- package manifest remains `quality_blocked`;
- external-submission contains `.test` fake contact text.

No frontend changes were made, so `UI_ACCEPTANCE_CHECKLIST.md` visual review was not applicable.

Final git status:

```text
clean working tree
```

## 2026-06-05 - QA fix log for end-to-end package generation

Date: 2026-06-05

Task: Fix end-to-end QA failures where `npm run check` passed but real test-mode package generation still ended as `quality_blocked`.

Constraints followed:

- Did not weaken quality gates.
- Did not remove validators.
- Did not lower the minimum portfolio page count.
- Did not mark `quality_blocked` packages as passed.
- Did not hide failures.
- Fixed generator and repair logic.

## Initial Context

Requested focus files:

- `src/lib/package.ts`
- `src/lib/portfolioRenderer.ts`
- related portfolio plan / repair functions
- `tests/portfolio*.test.mjs`
- end-to-end package tests

Observed failures from the request:

- Attempt 1 generated only 10 pages, below minimum 16.
- Attempt 2 generated 20 pages but failed project diversity, page rhythm, or layout strategy checks.
- Attempt 3 collapsed back to 10 pages after repair.
- Final repaired plan removed required layout types: single-image pages, detail pages, and mixed image/text pages.
- Final package remained `quality_blocked`.
- `npm run check` still passed, so tests did not catch the product failure.

The named file `artist-application-e2e-qa-log.md` was not present in the repository root when inspected.

## Files Changed

- `src/lib/package.ts`
- `tests/portfolio-planning-runner.mjs`
- `tests/package-behavior-runner.mjs`

## Implementation Changes

### `src/lib/package.ts`

Added a portfolio stabilization pass after:

- initial automatic plan generation
- normalized incoming plan handling
- each repair loop iteration

New/updated behavior:

- Duplicate-image repair no longer leaves the plan below the minimum page count.
- Required portfolio layout roles are restored after destructive repairs:
  - cover
  - statement/context
  - project dividers
  - grids
  - single image pages
  - detail pages
  - mixed image/text pages
  - selected works
  - contact/CV summary
- Stabilization uses full available source-audit works when restoring missing roles, not only the damaged current plan.
- Fresh/underused image groups are preferred when adding replacement grid, detail, or mixed text/image pages.
- Added image-use counting so restored pages do not create new duplicate-image failures.
- Stopped expanding single full-page images into mixed text/image pages using the same image, because that created invalid non-overview duplicate uses.
- Kept the existing visual gate and readiness validation intact.

Key helper functions added:

- `stabilizePortfolioPlan`
- `ensureRequiredPortfolioLayoutRoles`
- `freshImageGroup`
- `imageUseCounts`
- `portfolioPageImagePaths`
- `requiredPortfolioLayoutRoles`
- `trimPortfolioPagesPreservingRequiredRoles`

Other adjustments:

- `twoImagePage` now consistently derives metadata from the selected detail works.
- `contextPage` prefers a later work in the group to reduce repeated image use.
- `repairPortfolioPlan` now stabilizes its result before returning.
- Test hooks were expanded for regression tests.

### `tests/portfolio-planning-runner.mjs`

Strengthened planning coverage:

- Added a regression fixture where duplicate removal could previously collapse or damage the plan.
- Asserts repaired plans:
  - stay at or above the default minimum of 16 pages
  - stay at or below the default maximum of 24 pages
  - preserve every required layout role
  - keep at least 3 project groups when enough material exists

### `tests/package-behavior-runner.mjs`

Strengthened true end-to-end package assertions:

- Valid fake source data must produce `package_ready_for_final_review`.
- Valid fake source data must not produce `quality_blocked`.
- Actual portfolio page count must remain in the required range.
- Required layout strategies must be present in the rendered visual report:
  - cover
  - statement
  - project opener
  - grid
  - single-work full-page
  - detail / two-image spread
  - text-image context
  - selected works list
  - contact page

## Test / Debug Timeline

### 1. Initial inspection

Commands used:

```bash
pwd && rg --files
sed -n '1,240p' artist-application-e2e-qa-log.md
sed -n '1,260p' src/lib/package.ts
sed -n '1,280p' src/lib/portfolioRenderer.ts
```

Result:

- Repository root confirmed as `/Users/chenyu/Desktop/艺术家`.
- `artist-application-e2e-qa-log.md` was not found.
- Package readiness was confirmed to depend on rendered portfolio visual report and blocking issues.

### 2. Located repair loop and planning functions

Commands used:

```bash
rg -n "generatePortfolioWithAutoRepair|repair|duplicate|curatorial|projectGroup|PortfolioPlan" src/lib/package.ts
sed -n '813,1780p' src/lib/package.ts
```

Findings:

- `generatePortfolioWithAutoRepair` runs up to 3 repair rounds.
- `removeDuplicateImagePages` could drop pages destructively.
- `repairPortfolioPlan` returned repaired plans without a final page-count / required-role integrity pass.
- `expandPlanTowardTarget` could create duplicate non-overview uses by turning full-page images into mixed context pages.

### 3. First portfolio test run

Command:

```bash
npm run test:portfolio
```

Result:

- Failed after adding the new regression test.
- Failure reason: the test fixture used project titles like `Project 1`, which `inferProjectGroup` normalized into the same group after stripping trailing numbers.

Fix:

- Changed fixture titles to distinct project names:
  - `Atlas Red`
  - `Civic Surface`
  - `Archive Window`

### 4. Portfolio tests after fixture fix

Command:

```bash
npm run test:portfolio
```

Result:

```text
tests 9
pass 9
fail 0
```

### 5. First true package behavior run

Command:

```bash
node --test tests/package-behavior.test.mjs
```

Result:

- Failed, correctly catching the product failure.
- Final status was still:

```text
quality_blocked
```

Failure assertion:

```text
Expected values to be strictly equal:
+ actual - expected

+ 'quality_blocked'
- 'package_ready_for_final_review'
```

### 6. Inspected generated package failure

Commands used:

```bash
find generated/test-runs/applications -maxdepth 3 -name package-manifest.json -print | sort | tail -n 5
find generated/test-runs/applications -maxdepth 4 -name portfolio-visual-check.json -print | sort | tail -n 5
node -e '...inspect package-manifest.json...'
node -e '...inspect portfolio-visual-check.json...'
node -e '...inspect portfolio-plan.json...'
```

Finding:

- Page count was 22.
- Required layout roles were present.
- Aesthetic and professional PDF scores were 100.
- Remaining blocker was duplicate image use:

```text
Portfolio overuses 1 image file(s) beyond overview-to-detail rhythm.
```

Cause:

- The stabilizer restored a missing grid/context page using the same available work repeatedly.
- `project-08.jpg` was used too many times.

Fix:

- Added use counting while inserting restored pages.
- Changed role restoration to prefer fresh image groups from the full source audit.
- Updated inserted page selection so grid/detail/context pages do not all choose the same work.

### 7. True package behavior rerun

Command:

```bash
node --test tests/package-behavior.test.mjs
```

Result:

```text
pass 1
fail 0
duration_ms 193351.85875
```

Key line:

```text
writeApplicationPackage produces automated portfolio artifacts from real inputs
```

### 8. First full check

Command:

```bash
npm run check
```

Result:

- Failed at lint.

Lint findings:

```text
src/lib/package.ts
1733:50  warning  'index' is defined but never used
1903:7   error    'next' is never reassigned. Use 'const' instead
2405:10  warning  'conciseWorkNote' is defined but never used
```

Fixes:

- Removed unused `index` parameter from `detailPageFrom`.
- Changed `let next` to `const next`.
- Removed unused `conciseWorkNote`.

### 9. Final full check

Command:

```bash
npm run check
```

Result:

```text
lint: passed
typecheck: passed
test: passed
test:structure: passed
test:portfolio: passed
build: passed
```

Relevant final output:

```text
tests 22
pass 22
fail 0

Project structure verification passed.

tests 9
pass 9
fail 0

Next.js build compiled successfully.
```

## Final End-to-End Fake-Data Package Report

Inspected package:

```text
generated/test-runs/applications/990001-behavior-fixture-residency
```

Final manifest result:

```json
{
  "status": "package_ready_for_final_review",
  "readinessPassed": true,
  "portfolioPageCount": 22,
  "visualPassed": true,
  "aestheticScore": 100,
  "professionalPdfScore": 100
}
```

Layout strategy counts:

```json
{
  "cover": 1,
  "statement": 1,
  "project_opener": 6,
  "installation_with_details": 3,
  "single_work_full_page": 5,
  "two_image_spread": 2,
  "image_research_grid": 1,
  "text_image_context": 1,
  "selected_works_list": 1,
  "contact_page": 1
}
```

Required layout types:

```json
{
  "cover": true,
  "statementContext": true,
  "projectDividers": true,
  "grids": true,
  "singleImagePages": true,
  "detailPages": true,
  "mixedImageTextPages": true,
  "selectedWorks": true,
  "contactCvSummary": true
}
```

Missing required layout types:

```json
[]
```

Output boundary completeness:

```json
{
  "external-submission": {
    "complete": true,
    "files": 32
  },
  "user-review": {
    "complete": true,
    "files": 6
  },
  "internal-notes": {
    "complete": true,
    "files": 13
  }
}
```

Important generated files:

- `generated/test-runs/applications/990001-behavior-fixture-residency/package-manifest.json`
- `generated/test-runs/applications/990001-behavior-fixture-residency/internal-notes/portfolio-visual-check.json`
- `generated/test-runs/applications/990001-behavior-fixture-residency/internal-notes/portfolio-auto-repair-log.json`
- `generated/test-runs/applications/990001-behavior-fixture-residency/internal-notes/portfolio-plan.json`
- `generated/test-runs/applications/990001-behavior-fixture-residency/external-submission/portfolio.pdf`

## Known Limitations

- The original requested QA log file `artist-application-e2e-qa-log.md` was not present in the workspace root during this run.
- The raw terminal transcript from Codex tool execution was not automatically written to a file before this log was created.
- This log records the commands, failures, fixes, and final outputs from the run, but it is not a byte-for-byte capture of every terminal buffer.

## Final Status

The end-to-end fake-data package generation now passes existing quality gates in test mode.

Final package status:

```text
package_ready_for_final_review
```

The previous failure mode is now covered by tests, so `npm run check` fails if valid fake data produces a below-minimum portfolio, misses required layout roles, or ends as `quality_blocked`.

## 2026-06-05 16:29:17 CST

Task: Create persistent work log.

Files changed:
- `WORKLOG.md`

Inspections performed:
- Listed project root files.
- Read `AGENTS.md`.
- Checked git status.

Tests/checks run:
- `git status --short`
- `rg --files -g 'AGENTS.md' -g 'FRONTEND_STYLE_GUIDE.md' -g 'UI_ACCEPTANCE_CHECKLIST.md' -g 'README*' -g 'package.json' -g 'pyproject.toml' -g 'Cargo.toml'`
- `date '+%Y-%m-%d %H:%M:%S %Z'`

Verification results:
- Confirmed existing uncommitted changes before this task:
  - `src/lib/package.ts`
  - `tests/package-behavior-runner.mjs`
  - `tests/portfolio-planning-runner.mjs`
- Added a dedicated log file for future modifications, inspections, and tests.

Known limitations:
- No product code or frontend code changed.
- No automated test suite was run because this task only added documentation/logging.

## 2026-06-05 16:37:08 CST

Task: Clarify log timestamp requirement.

Files changed:
- `WORKLOG.md`

Inspections performed:
- Checked current local time for the log entry.

Tests/checks run:
- `date '+%Y-%m-%d %H:%M:%S %Z'`

Verification results:
- Updated the logging rule to explicitly require date and time in each section heading.

Known limitations:
- No product code or frontend code changed.

## 2026-06-05 17:53:08 CST

Task: Review QA fix before merge.

Files changed:
- `WORKLOG.md`

Inspections performed:
- Checked `git diff --stat` and changed file list.
- Reviewed package status handling in `src/lib/package.ts`.
- Verified `quality_blocked` remains the failure status and is not renamed as success.
- Verified portfolio readiness still depends on the readiness and portfolio quality gates.
- Verified critical portfolio issue validators remain present, including page count, missing images, forbidden terms, layout diversity, duplicate images, aesthetic score, and professional PDF score.
- Verified default package output still reports `minimumPages: 16` and `maximumPages: 24`.
- Reviewed fresh package manifest and visual report for the behavior fixture package.

Tests/checks run:
- `git diff --stat && git diff --name-only`
- `rg -n "quality_blocked|package_ready_for_final_review|portfolioPageCount|quality gate|validator|external-submission|user-review|internal-notes|layout" .`
- `npm run check`
- Fresh package summary read from `generated/test-runs/applications/990001-behavior-fixture-residency/package-manifest.json`
- Fresh visual summary read from `generated/test-runs/applications/990001-behavior-fixture-residency/internal-notes/portfolio-visual-check.json`

Verification results:
- Diff summary: `src/lib/package.ts`, `tests/package-behavior-runner.mjs`, and `tests/portfolio-planning-runner.mjs` changed; 309 insertions and 40 deletions.
- `npm run check` passed: lint, typecheck, 22 tests, structure verification, 9 portfolio tests, and production build.
- Behavior fixture package status: `package_ready_for_final_review`.
- Behavior fixture `portfolioPageCount`: 22, within 16-24.
- Required layout roles all present: cover, statement, project dividers, grids, single-image pages, detail pages, mixed image/text pages, selected works list, and contact/CV summary.
- `external-submission`, `user-review`, and `internal-notes` completeness checks passed for the behavior fixture.

Known limitations:
- No frontend code changed; `UI_ACCEPTANCE_CHECKLIST.md` was not applicable.
- The older manual `generated/test-runs/qa-e2e/verification-summary-880003.json` remains stale and still records a previous blocked run; it was inspected but not rewritten because this review was requested not to make feature changes.

## 2026-06-05 18:04:14 CST

Task: Consolidate historical modification and test logs into WORKLOG.

Files changed:
- `WORKLOG.md`
- `docs/maintenance.md`
- `docs/rules.md`
- `scripts/verify-project.mjs`
- `src/lib/automationRules.ts`
- `docs/fix-log.md`
- `generated/codex/automation-instructions.md`
- `generated/codex/qa-fix-log-2026-06-05.md`
- `generated/test-runs/qa-e2e/artist-application-e2e-qa-log.md`

Inspections performed:
- Searched for old log references with `rg`.
- Checked tracked status for old log files.
- Reviewed `docs/fix-log.md`, `WORKLOG.md`, and `generated/codex/qa-fix-log-2026-06-05.md`.
- Reviewed `generated/test-runs/qa-e2e/artist-application-e2e-qa-log.md`.
- Checked structure verification requirements in `scripts/verify-project.mjs`.
- Checked machine-rule text in `src/lib/automationRules.ts`.

Tests/checks run:
- `rg -n "fix-log|WORKLOG|log|日志|Tests/checks|Verification|Files Changed|## [0-9]{4}-[0-9]{2}-[0-9]{2}" . -g '*.md'`
- `git ls-files docs/fix-log.md generated/codex/qa-fix-log-2026-06-05.md generated/test-runs/qa-e2e/artist-application-e2e-qa-log.md docs/maintenance.md docs/rules.md generated/codex/automation-instructions.md WORKLOG.md`
- `rg -n "docs/fix-log\\.md|fix-log\\.md|qa-fix-log" . -g '*.md' -g '*.ts' -g '*.mjs'`
- `find . -path './node_modules' -prune -o -path './.next' -prune -o \\( -iname '*log*.md' -o -iname '*qa*.md' \\) -print`
- `date '+%Y-%m-%d %H:%M:%S %Z'`
- `npm run test:structure`
- `npm run typecheck`

Verification results:
- Migrated historical `docs/fix-log.md` sections into `WORKLOG.md` in chronological order.
- Migrated `generated/codex/qa-fix-log-2026-06-05.md` into `WORKLOG.md`.
- Migrated `generated/test-runs/qa-e2e/artist-application-e2e-qa-log.md` into `WORKLOG.md`.
- Deleted `docs/fix-log.md`.
- Deleted `generated/codex/qa-fix-log-2026-06-05.md`.
- Deleted `generated/test-runs/qa-e2e/artist-application-e2e-qa-log.md`.
- Updated active project rules and structure checks to use `WORKLOG.md`.
- Remaining `docs/fix-log.md` mentions are historical references inside migrated records only, not active instructions or required files.
- `npm run test:structure` passed.
- `npm run typecheck` passed.

Known limitations:
- Historical entries preserve their original file-change lists, so some migrated records still mention that they previously changed `docs/fix-log.md`.
- No product behavior or frontend code changed for this log consolidation.

## 2026-06-05 18:09 CST Mandatory WORKLOG enforcement

### Task Goal

- Implement local enforcement that requires `WORKLOG.md` to be updated whenever project files change.

### Files Changed

- `AGENTS.md`
- `scripts/check-worklog-updated.mjs`
- `package.json`
- `WORKLOG.md`

### What Changed

- Appended the mandatory WORKLOG rule to `AGENTS.md`.
- Added `scripts/check-worklog-updated.mjs` to inspect unstaged, staged, and untracked project changes and require a root `WORKLOG.md` update.
- Added the `check:worklog` npm script.
- Appended this entry documenting the enforcement task.

### Why It Changed

- The project requires a durable local record of every task that changes code, configuration, tests, scripts, documentation, generated behavior, or project structure.

### Tests/Checks Run

- `npm run check:worklog`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:structure`
- `npm run test:portfolio`
- `npm run build`
- Temporary git repository failure-path verification for project changes without a `WORKLOG.md` update.
- Temporary git repository pass-path verification for project changes with a `WORKLOG.md` update.

### Result

- Passed: `npm run check:worklog`
- Passed: `npm run lint`
- Passed: `npm run typecheck`
- Failed: `npm run test` did not complete cleanly; 21 tests passed, 1 test file was cancelled after `tests/package-behavior.test.mjs` left pending event-loop work.
- Passed: `npm run test:structure`
- Passed: `npm run test:portfolio`
- Passed: `npm run build`
- Passed: failure-path verification exited with code 1 and printed the required WORKLOG message.
- Passed: pass-path verification exited with code 0 when `WORKLOG.md` changed with project files.

### Issues Found

- `npm run test` hangs in `tests/package-behavior.test.mjs` after visible test output completes, reporting pending promise/event-loop work when terminated.
- The worktree already had unrelated modified and deleted files before this enforcement task.

### Next Steps

- Investigate the pre-existing `tests/package-behavior.test.mjs` pending event-loop behavior separately if full-suite clean exit is required.

## 2026-06-05 19:55 CST Portfolio mock generation quality review

### Task Goal

- Run a safe local mock portfolio generation for visual quality review without submitting any application or writing real application state.

### Files Changed

- `scripts/mock-portfolio-quality-review.mjs`
- `generated/test-runs/portfolio-quality-review/`
- `artist-application-portfolio-quality-review.md`
- `WORKLOG.md`

### What Changed

- Added a dedicated local mock portfolio quality-review runner that creates an isolated workspace under `generated/test-runs/portfolio-quality-review/_mock-workspace`.
- Generated a test application package through the existing `writeApplicationPackage` portfolio path using `runMode: "test"`.
- Wrote `portfolio.pdf`, `portfolio.html`, internal portfolio plan/visual-check/auto-repair logs, PDF page screenshots, and a portfolio contact sheet under `generated/test-runs/portfolio-quality-review/`.
- Added a human-style QA report at `artist-application-portfolio-quality-review.md`.

### Why It Changed

- The portfolio PDF is the primary external-facing artifact, and this task required direct local visual inspection rather than only unit-test execution.

### Tests/Checks Run

- `node --experimental-strip-types --loader ./tests/ts-esm-loader.mjs scripts/mock-portfolio-quality-review.mjs`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run test:portfolio`
- `npm run test:structure`
- `npm run check`
- `npm run build`
- `npm run check:worklog`

### Result

- Passed: mock portfolio generation completed in isolated `generated/test-runs/portfolio-quality-review/` output.
- Passed: `npm run lint`
- Passed: `npm run typecheck`
- Passed: `npm test` completed 22 tests successfully.
- Passed: `npm run test:portfolio` completed 9 tests successfully.
- Passed: `npm run test:structure`
- Passed: `npm run check`
- Passed: `npm run build`
- Passed: `npm run check:worklog`

### Issues Found

- Generated package status is `quality_blocked`.
- The portfolio visual gate reports unresolved duplicate image overuse after three auto-repair rounds.
- The mock image set is visually homogeneous and suitable for layout QA only, not real submission content.

### Next Steps

- Fix duplicate-image repair so restored required pages prefer unused alternate images before reusing any source image beyond the allowed overview/detail rhythm.

## 2026-06-05 20:16 CST Real artwork portfolio review generation

### Task Goal

- Replace the synthetic mock portfolio images with the artist's real local artwork images and regenerate the test-run portfolio for direct visual review.

### Files Changed

- `scripts/real-portfolio-quality-review.mjs`
- `generated/test-runs/portfolio-quality-review/`
- `artist-application-portfolio-quality-review.md`
- `WORKLOG.md`

### What Changed

- Added a real-artwork portfolio quality-review runner that selects readable images from `artist-assets/inbox/works/` project folders.
- Built a structured 20-page portfolio plan using five project groups: Iconoclasm, What are you looking for, Measurement 2.0, Mausoleum 2024, and Love and Hope.
- Regenerated `portfolio.pdf`, `portfolio.html`, page screenshots, contact sheet, internal plan, visual check, and auto-repair log under `generated/test-runs/portfolio-quality-review/`.
- Added test-run PDF image optimization after generation so the final PDF fits under the 20 MB external file gate without modifying original artwork files.
- Updated the QA report to reflect the real-artwork portfolio result.

### Why It Changed

- The user wanted the portfolio preview to include their actual artworks instead of synthetic mock images.

### Tests/Checks Run

- `node --experimental-strip-types --loader ./tests/ts-esm-loader.mjs scripts/real-portfolio-quality-review.mjs`
- `npm run lint`
- `npm run check:worklog`

### Result

- Passed: real-artwork portfolio generation completed.
- Passed: package status is `package_ready_for_final_review`.
- Passed: visual gate, file quality gate, and 20 page screenshot export.
- Passed: `npm run lint`
- Passed: `npm run check:worklog`

### Issues Found

- The `works` database table is empty, so captions are inferred from image folders and project names rather than verified artwork metadata.
- Default package image compression produced a PDF over 20 MB before the test-run optimization pass.

### Next Steps

- Populate the `works` database with verified artwork metadata and preferred portfolio image paths.

## 2026-06-05 22:01 CST Mandatory complete artwork image selection enforcement

### Task Goal

- Make portfolio generation enforce complete artwork documentation as primary images, with detail/crop/process/installation/archive/reference/temporary images downgraded to support-only unless no complete image exists.

### Files Changed

- `AGENTS.md`
- `src/types/domain.ts`
- `src/lib/schemas.ts`
- `src/lib/portfolioImageAnalysis.ts`
- `src/lib/package.ts`
- `src/lib/portfolioRenderer.ts`
- `src/lib/portfolioQualityCheck.ts`
- `src/lib/qualityChecks.ts`
- `tests/portfolio-planning-runner.mjs`
- `tests/portfolio-quality-runner.mjs`
- `scripts/mock-portfolio-quality-review.mjs`
- `artist-application-portfolio-quality-review.md`
- `generated/test-runs/portfolio-quality-review/`
- `WORKLOG.md`

### What Changed

- Appended the mandatory portfolio image selection rule to `AGENTS.md`.
- Extended portfolio image roles and schemas with `complete_work_image`, `primary_documentation`, `temporary`, `cropped`, `partial`, and mandatory analysis/audit fields.
- Added image analysis fields for assigned/recommended roles, complete-work score, primary candidacy, crop/partial/temporary risks, support-only status, and selection/rejection reasons.
- Changed portfolio planning and repair so single-work full pages and primary project/overview leads prefer complete/primary documentation images and replace support-only images when complete images exist.
- Added source audit records for all available images, selected images, excluded images, support-only downgrades, project-group primary image paths, risks, and selection/exclusion reasons.
- Added hard portfolio quality gates for support-only primary usage, detail/process/installation on single-work full pages, complete image exists but not primary, incomplete overview grids, and selected works list overreach.
- Added metadata/score caching to avoid repeated sharp subprocess metadata reads during quality gates and package tests.
- Updated the mock portfolio quality-review runner to include support-only fixture images, regenerate the portfolio review output, and write a QA report with primary paths and excluded/supporting image details.

### Why It Changed

- Portfolio output must not use cropped/detail/process/installation/context images as main work representations when complete artwork photos exist.
- The rule needs to be enforced by code, audit files, renderer gates, quality checks, and tests rather than relying on prompt wording or manual review.

### Tests/Checks Run

- `node --experimental-strip-types --loader ./tests/ts-esm-loader.mjs scripts/mock-portfolio-quality-review.mjs`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run test:portfolio`
- `npm run test:structure`
- `npm run build`
- `npm run check`

### Result

- Passed: mock portfolio generation completed in isolated `generated/test-runs/portfolio-quality-review/`.
- Passed: generated package status is `package_ready_for_final_review`.
- Passed: generated portfolio has 20 pages and 20 page screenshots.
- Passed: `npm run lint`.
- Passed: `npm run typecheck`.
- Passed: `npm test` completed 22 tests successfully.
- Passed: `npm run test:portfolio` completed 9 tests successfully.
- Passed: `npm run test:structure`.
- Passed: `npm run build`.
- Passed: `npm run check`.

### Issues Found

- Initial path heuristics incorrectly matched the temporary workspace directory name `artist-studio-fixture` as a studio/process photo signal; fixed by matching support-only terms against image filenames.
- High-resolution synthetic test images had very small file sizes and were initially under-scored; fixed so file size is recorded as a risk without overriding complete artwork candidacy when resolution and filename signals are strong.
- Mandatory primary insertion initially over-expanded short portfolios and duplicated primary images; fixed by limiting enforcement to core project groups in the plan, preserving preferred page ranges, and replacing/removing duplicate context images.

### Next Steps

- Populate real artwork records with verified metadata and explicit preferred complete image paths so audit reasons can be more specific than filename/path heuristics.

## 2026-06-06 06:24 CST Figma application package design workflow rule

### Task Goal

- Persist the user's requirement that application package UI/final-review package design must be implemented from exact Figma references with Figma skill context, screenshot capture, repo pattern reuse, and Playwright validation.

### Files Changed

- `AGENTS.md`
- `docs/application_rules.md`
- `docs/rules.md`
- `src/lib/automationRules.ts`
- `WORKLOG.md`

### What Changed

- Added a project-level Figma implementation rule for application package and final-review package UI work.
- Added application-rule and long-term-rule documentation requiring exact `get_design_context`, truncated-context recovery via `get_metadata`, exact variant `get_screenshot`, existing token/component reuse, desktop/mobile responsiveness, direct use of Figma-returned localhost/SVG assets, and Playwright comparison.
- Added the same rule to machine-readable automation instructions and prompt preferences.
- Clarified that Figma implementation must not introduce extra user review nodes beyond opportunity selection and final submission package approval.

### Why It Changed

- Future application package design work needs a durable implementation workflow instead of relying on chat-only instructions.
- The rule must align with the project's two-node review model and existing design-system constraints.

### Tests/Checks Run

- `npm run typecheck`

### Result

- Passed: `npm run typecheck`.

### Issues Found

- No Figma file, frame, or node URL was provided in this task, so no actual Figma implementation or Playwright visual comparison was possible.
- Existing unrelated worktree modifications were present before this task and were left untouched.

### Next Steps

- When a concrete Figma URL/node is provided, use the Figma skill workflow and validate the implemented UI with Playwright against the exact reference.
