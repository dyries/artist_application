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
