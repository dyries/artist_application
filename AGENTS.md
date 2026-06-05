# AGENTS.md

## Project goal

This project is an artist application automation tool.

It helps artists and small studios:
- manage artworks
- generate polished portfolio PDFs
- prepare exhibition / residency / grant / gallery application packages
- track deadlines and submissions

This is not a generic SaaS dashboard. It should feel like a premium creative studio tool for artists, curators, galleries, and portfolio consultants.

## Core product model

The product must stay highly automated.

The user should only review two things:

1. Opportunity selection
   - The system researches many possible opportunities.
   - The system compares them against the artist database, artwork database, CV, themes, medium, location, language, prior applications, and eligibility.
   - The system recommends a small shortlist, usually around 5 opportunities.
   - The user chooses which opportunities to apply for.

2. Final submission package
   - The system automatically prepares the portfolio PDF, artist statement, bio, CV, image files, email/form text, and required attachments.
   - The user only approves submission or requests revision.

Do not introduce extra review steps.

The user must not be asked to:
- manually choose portfolio images
- approve every caption
- pick layout templates
- pick color palettes
- inspect every page
- repair ugly portfolio pages
- manually compare hundreds of opportunities

Only ask the user for input when there is a true blocker:
- missing required material
- unclear eligibility
- required fee/payment
- login/captcha
- legal declaration
- privacy risk
- irreversible submission action
- missing usable artwork files
- required physical artwork availability is unclear

Ordinary quality problems must be handled automatically.

## Core principle

Do not optimize only for working code.

Optimize for:
1. reliable workflows
2. editable outputs
3. beautiful portfolio/application materials
4. clear two-node user review
5. strong visual hierarchy
6. maintainable code
7. automated quality repair

## Frontend rules

Before making frontend changes, read:

- FRONTEND_STYLE_GUIDE.md
- UI_ACCEPTANCE_CHECKLIST.md

Do not create generic SaaS UI.
Do not use default blue/purple dashboard styling.
Do not add random gradients, emojis, heavy shadows, inconsistent cards, or unrelated design systems.

The UI should feel closer to:
- contemporary gallery website
- editorial art archive
- artist portfolio management system
- premium creative studio back office

## Figma implementation rule for application package design

When a task provides a Figma file, frame, or node for application package UI or final-review package design, implement from the exact Figma reference using the Figma skill.

Required workflow:

- Start with `get_design_context` for the exact node or frame.
- If the response is truncated, use `get_metadata` to map the file and then re-fetch only the needed nodes with `get_design_context`.
- Run `get_screenshot` for the exact variant before coding.
- Reuse existing design system components and tokens.
- Translate Figma output into this repo's utilities and component patterns instead of creating a parallel system.
- Match spacing, layout, hierarchy, and responsive behavior closely.
- Respect the repo's routing, state, and data-fetch patterns.
- Make the page responsive on desktop and mobile.
- If Figma returns localhost image or SVG sources, use them directly and do not create placeholders or add new icon packages.
- Validate the finished UI against the Figma reference with Playwright and iterate until the look and behavior match.

This rule does not add user review steps. The product still keeps only opportunity selection and final submission package approval as default user review nodes.

## PDF / portfolio rules

The portfolio PDF is the primary external-facing artifact.

When no opportunity-specific page limit exists:
- target: 20 pages
- preferred range: 18-22 pages
- acceptable range: 16-24 pages

A good portfolio should include:
- cover
- artist statement
- selected works overview
- project section openings
- full-bleed or large image pages
- detail pages
- double-image pages
- image + text pages
- captions with title, year, medium, dimensions
- CV / contact summary

Avoid:
- plain white image grids only
- one image per page repeated mechanically
- selecting only one project or series unless genuinely appropriate
- empty pages
- preview / test / draft language in final PDFs
- web-preview-first output
- forcing the user to manually fix layout decisions

The PDF must look like a formal artist application portfolio, not a debug export.

## Portfolio quality model

Bad portfolio output is a system failure, not a user editing task.

If the generated portfolio is:
- too short
- ugly
- repetitive
- web-preview-like
- all-white with weak hierarchy
- missing project rhythm
- using distorted images
- using draft/test/preview language

then the system must automatically repair and rerender it, or mark the package as `quality_blocked`.

Do not mark a package as ready if the portfolio PDF fails the quality gate.

## Language rules

Internal notes may be bilingual.

User review materials should support Chinese and English.

Final application materials should match the opportunity language.

Do not mix internal explanations into final client-facing materials.

External-facing materials must never include:
- internal rationale
- generated by AI
- ready to copy
- draft
- preview
- test
- mock
- placeholder
- unknown
- N/A
- TBD

If metadata is missing, omit it externally and record it internally.

## Coding rules

Before changing code:
1. inspect the existing structure
2. identify affected files
3. explain the implementation plan briefly
4. avoid unnecessary rewrites

When implementing:
- preserve existing business logic unless the task explicitly says to change it
- reuse components
- avoid duplicated styles
- avoid large unrelated refactors
- keep code readable
- add or update tests when logic changes
- run available checks if possible

## Task completion report

At the end of each task, report:
- files changed
- what changed
- tests/checks run
- any known limitations
- screenshots or visual verification notes if frontend changed

If frontend changed, explicitly confirm that UI_ACCEPTANCE_CHECKLIST.md was checked.

## Mandatory WORKLOG Rule

Every task that changes code, configuration, tests, scripts, documentation, generated behavior, or project structure must append a new entry to the root `WORKLOG.md`.

Rules:
- Never overwrite old WORKLOG entries. Only append new entries.
- Each entry must include:
  - date/time
  - task goal
  - files changed
  - what changed
  - why it changed
  - tests/checks run
  - result: passed / failed / not run
  - issues found
  - next steps
- If tests were not run, explain why.
- A task is not complete until `WORKLOG.md` has been updated.
- Before finishing any task, run `npm run check:worklog` when available.

## Mandatory Portfolio Image Selection Rule

Portfolio generation must prioritize complete artwork documentation.

Rules:

* Complete artwork images must be used as primary portfolio images whenever available.
* Detail, cropped, process, installation, archive, reference, temporary, packing, studio, screenshot, or partial images may only be used as supporting/context images.
* Supporting images must not be used for `single_work_full_page`, primary project presentation, or main selected-work representation when a complete image exists.
* If a complete image exists but the system selects a partial/supporting image as primary, that is a quality failure.
* If no complete image exists for a required project group, record it in internal notes and mark the portfolio as `quality_blocked` unless the opportunity explicitly accepts documentation/context-only material.
* This rule must be enforced in code, quality gates, tests, and generated portfolio audit files.
