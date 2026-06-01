# Portfolio Generation Rules

- Read existing user portfolio material first and record the source.
- Generate `internal-notes/portfolio-source-audit.json` before layout. It must cover existing portfolio sources, available works, formal image files, missing metadata, low-confidence facts, opportunity constraints, and materials actually used.
- Generate `internal-notes/portfolio-plan.json` as structured data before rendering. The renderer must use `PortfolioPlan` pages and image roles, not parse natural-language `selectedWorks`.
- Record web/design research references before generating the portfolio. Use references only for structure, rhythm, image/text ratio, caption conventions, whitespace, and application PDF norms.
- Record at least three portfolio design/application references; otherwise keep the package `quality_blocked`.
- Do not copy a specific portfolio design.
- Prefer restrained layouts, clear image priority, short captions, and mature spacing.
- The default cover is artist name, `Selected Works`, year, and contact/website only if available. Do not make the opportunity title the portfolio title.
- Show selected works clearly before detail/process/context views.
- Captions should normally include title, year/date, medium, dimensions or duration where known. Missing facts are omitted externally and recorded internally; do not write `unknown`, `N/A`, `TBD`, or "dimensions recorded in source material".
- Installation and series pages must distinguish overview, detail, installation, reverse/back, process, and context images. Do not squeeze many small images into a page.
- Every formal portfolio image path must exist under `artist-assets/works/`, `artist-assets/source-materials/`, or `artist-assets/inbox/`, be readable by `sharp`, copy into `external-submission/images/`, and load in `portfolio.html`.
- If any planned formal image fails validation/copy/render, the package must be `quality_blocked`; do not silently skip it.
- After generation, check the rendered HTML/PDF for missing images, page count, file size, forbidden terms, too-small images, blank pages, caption readability, dense layouts, overlong captions, generic statement text, and whether the result ignores the artist's existing style.
- If quality checks fail, keep the package `quality_blocked` and record the issue in internal notes.
- The package writer must generate a restrained `external-submission/portfolio.html` and, when Playwright is available, `external-submission/portfolio.pdf`.
- The visual/structure report belongs in `internal-notes/portfolio-visual-check.json`, not in external files.

Research references used to define these rules included ExhibitFolio, Artists Collecting Society portfolio guidance, Carnegie Mellon MFA upload guidance, and residency statement guidance emphasizing specific work/program fit.
