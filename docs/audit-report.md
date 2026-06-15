# Artist Application Automation Audit Report

Date: 2026-05-26

## Scope

Audited code, prompts/rules, workflow, status model, output naming, generated package boundaries, CV/bio/statement/application-answer/email output, user review surface, test/mock isolation, README/docs, and current tests.

## Findings

- Control flow generated application packages directly from model output for any existing opportunity. It did not enforce the product rule that users first choose which opportunities to apply for.
- Package output mixed review, internal, and institution-facing text in files named `draft` and `application-package`, which made it easy for internal language to leak into public materials.
- External text was not programmatically checked for internal workflow words, AI traces, placeholder terms, negative missing-information terms, or generic AI-like art writing.
- User-facing review defaults were bilingual/English-heavy rather than Chinese-first. English formal materials did not have a mandatory Chinese review summary.
- Portfolio generation rules existed as guidance but not as a gate: there was no check that existing artist portfolios were read first, no recorded web/design research, and no post-generation structure check.
- Status lifecycle did not include the explicit first user review node (`selected_by_user` / `not_selected`) or a quality-blocked state.
- Test/mock runs had no durable run mode in generated outputs or manifest records, so they could be confused with real application preparation.
- UI showed “draft” fields and did not give the user a clear opportunity selection control.
- Docs described useful boundaries but did not fully reflect the two-review-node product contract or the three-directory package model.
- Tests were mostly repository-structure checks; they did not verify external-output sanitizing, Chinese review requirements, package boundaries, or test-run isolation rules.

## Changes Made

- Added application quality modules for external text sanitizing, Chinese review checks, AI-cliche detection, missing-info omission, and portfolio preparation/output checks.
- Reworked package generation into `internal-notes/`, `user-review/`, and `external-submission/`.
- Added `selected_by_user`, `not_selected`, `quality_blocked`, `package_ready_for_final_review`, and `approved_for_submission` statuses.
- Added `run_mode` and `boundary_model` fields to application/package records.
- Added opportunity selection API and UI controls.
- Changed project automation to generate packages only for user-selected/preparing opportunities.
- Added test/mock output path separation under `generated/test-runs/` or `generated/mock-runs/`.
- Updated machine rules, README, and policy docs.

## Residual Risks

- PDF rendering is best-effort and depends on Playwright availability; when unavailable the HTML portfolio and internal visual report are still produced.
- Deep design judgment still benefits from Codex/browser review, but package generation now produces a portfolio layout file and internal visual/structure report automatically.
- Final submission still needs explicit user approval and may require browser/login/payment/captcha handling outside this package-generation path.

## 2026-06-11 Follow-up Audit

### Findings

- The first opportunity review exposed the entire stored candidate pool, including expired and clearly ineligible opportunities, instead of a small shortlist.
- Completing the first review marked every hidden/unselected reviewable opportunity as `not_selected`; this would be unsafe once the UI became a shortlist.
- The visual gate checked image visibility and caption size but did not measure aspect-ratio distortion, printable overflow, content occupancy, cover hierarchy, or repeated rendered structures.
- Editable portfolio HTML remained in `external-submission/`, even though it is a rendering source rather than a formal submission artifact.
- Final file checks validated extension and size but did not extract and scan PDF text for forbidden external wording.
- The generated file checklist omitted produced PDFs and opportunity-specific variants.
- Readiness hard-coded English bio/statement/email/application filenames even for Chinese-language opportunities.

### Changes Made

- Added a five-item opportunity shortlist that removes expired and explicit eligibility-conflict records, while keeping active applications in a separate section.
- Changed the review API to update only opportunity IDs that were actually shown in the shortlist.
- Added structured DOM visual metrics for image distortion, page overflow, artwork occupancy, visual hierarchy, and repeated rendered structure, with three-round repair and fail-closed readiness.
- Moved editable HTML sources to `internal-notes/editable-render-sources/` and kept formal PDFs as the primary external artifacts.
- Added `pypdf` text extraction to the final external-file gate and fail-closed behavior when PDF text cannot be inspected.
- Rebuilt external file checklists from actual generated artifacts and made required filenames opportunity-language-aware.

## 2026-06-11 Completion Audit

| Requirement | Evidence | Result |
| --- | --- | --- |
| Audit code, rules, generation, quality gates, tests, and worklog | Follow-up findings in this report; implementation and regression tests changed across package, renderer, file-quality, shortlist, and UI modules | Passed |
| Default 16-24 page portfolio, target around 20 | Real-artwork artifact has 22 pages; page-count gates and repair tests cover low/high counts | Passed |
| At least five layouts and no long repeated run | Real artifact has 12 strategies and longest run 2; renderer blocks runs over 3 | Passed |
| Complete artwork images as primary | Source audit records project primaries; mandatory gate blocks support-only primary use | Passed |
| Visual hierarchy, distortion, overflow, caption density, image scale | Structured DOM metrics plus renderer checks; real artifact reports zero DOM issues/distortions/overflows | Passed |
| Three-round repair and `quality_blocked` fallback | Auto-repair loop max is 3; behavior tests cover failed low-quality output and blocked status | Passed |
| Forbidden external wording | Markdown/HTML and extracted PDF text scan includes AI generated, generated by AI, preview, test, mock, debug, draft, placeholder, unknown, N/A, TBD, ready-to-copy, and internal-note language | Passed |
| Internal/user/external separation | Editable HTML is internal; formal PDF/text/upload assets are external; tests assert boundaries | Passed |
| Complete opportunity-specific package variants | Behavior tests generate default PDF, short PDF, combined PDF, image upload folder, captions, email, answers, and checklist as required | Passed |
| Exactly two default user review nodes | Machine rules, manifest, API, and UI expose opportunity selection and final package approval only | Passed |
| Small opportunity shortlist | UI and shortlist tests limit first review to five eligible, unexpired recommendations | Passed |
| Frontend acceptance | Browser inspection covered desktop and 390px mobile layouts; mobile horizontal overflow was found and fixed | Passed |
| Real PDF/artifact visual inspection | Real local artwork PDF, 22 screenshots, and contact sheet were generated and inspected | Passed |
| Required checks and worklog | Full npm check and worklog gate recorded in `WORKLOG.md` | Passed |

### Remaining Data Limitation

- The works database still lacks verified metadata for many local images. The system omits missing metadata externally and records the limitation internally, but final captions become more specific when verified titles, dimensions, media, and preferred complete-image paths are populated.
