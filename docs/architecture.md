# Architecture and Maintenance Boundaries

This project should stay organized around workflow boundaries, not around one large UI component or one large data-access file.

## Frontend

- `src/app/components/Studio.tsx` is the page container. It owns screen-level state, tab selection, busy/error/message state, and API workflow handlers.
- `src/app/components/StudioPanels.tsx` owns tab-level rendering for materials, works, CV, opportunities, submissions, and settings.
- `src/app/components/ProfilePanel.tsx`, `StudioChrome.tsx`, and `FormControls.tsx` remain focused reusable UI components.
- `src/app/components/studioModel.ts` contains client-side defaults, labels, option lists, and save-payload normalization.
- `src/app/components/studioApi.ts` is the client API helper.

Next frontend split, when needed: move workflow handlers from `Studio.tsx` into hooks such as `useStudioData`, `useMaterialsWorkflow`, and `useAutomationWorkflow`. Do this after the panel split is stable so data flow remains easy to review.

## Backend

`src/lib/db.ts` currently contains several responsibilities:

- SQLite connection and migrations.
- Database row types and row-to-domain mappers.
- Artist profile, works, CV, and material source reads/writes.
- Opportunity and application reads/writes.
- Activity log and package manifest writes.

This file should be split in small, behavior-preserving steps:

1. Move migration and connection code to `src/lib/db/connection.ts` and `src/lib/db/migrations.ts`.
2. Move row types and mappers to `src/lib/db/mappers.ts`.
3. Move artist profile, works, CV, and material source operations to `src/lib/repositories/artistRepository.ts`.
4. Move opportunity and application operations to `src/lib/repositories/opportunityRepository.ts`.
5. Move activity log and package manifest operations to `src/lib/repositories/auditRepository.ts`.
6. Keep `src/lib/db.ts` temporarily as a compatibility export barrel, then migrate imports gradually.

The API routes should depend on repository/service functions, not on raw SQL. Automation modules such as `projectAutomation.ts`, `opportunityPages.ts`, and `codexWorkspace.ts` should call service-level functions once the repository split is in place.

## Services

Business workflows should live outside API routes and outside database repositories:

- Material import and scanning: `fileMaterials.ts`, `materialScanner.ts`, and a future `materialService.ts`.
- Opportunity page verification: `opportunityPages.ts`.
- Project automation: `projectAutomation.ts`.
- Codex workspace export: `codexWorkspace.ts`.
- Package writing: `package.ts` and `documentOutputs.ts`.

API routes should validate input, call a service/repository function, and return an API response. They should not accumulate workflow logic.

## Guardrails

- Prefer small splits with unchanged exports first.
- Keep `npm run typecheck` green after every structural move.
- Add repository tests before changing SQL behavior.
- Avoid changing UI behavior during structural refactors unless the user explicitly asks for it.
