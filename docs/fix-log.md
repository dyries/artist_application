# Fix Log

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
