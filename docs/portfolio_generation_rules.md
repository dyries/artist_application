# Portfolio Generation Rules

- Read existing user portfolio material first and record the source.
- Generate `internal-notes/portfolio-source-audit.json` before layout. It must cover existing portfolio sources, available works, formal image files, missing metadata, low-confidence facts, opportunity constraints, and materials actually used.
- Generate `internal-notes/portfolio-plan.json` as structured data before rendering. The renderer must use `PortfolioPlan` pages and image roles, not parse natural-language `selectedWorks`.
- `PortfolioPlan` must carry a controlled design system when possible: `quiet_white`, `warm_archive`, `soft_gray_gallery`, `dark_installation`, `image_research_bluegray`, or `painting_color_field`. Each theme defines page background, text/accent color, caption treatment, image frame rules, page numbering, and margin rhythm.
- If the opportunity does not specify a page limit, default to a formal portfolio around 20 pages (`targetPages: 20`, `minimumPages: 16`, `maximumPages: 24`). Explicit opportunity limits override this default.
- If the default portfolio remains below 16 pages after automatic repair, the package must be `quality_blocked`; a short default portfolio cannot be marked ready merely because a PDF file exists.
- If the opportunity explicitly requires individual image upload only and says not to submit a portfolio PDF, treat that as an opportunity constraint. Generate `images-for-upload/` and do not force the default 20-page PDF rule.
- Record web/design research references before generating the portfolio. Use references only for structure, rhythm, image/text ratio, caption conventions, whitespace, and application PDF norms.
- Prefer `ARTIST_STUDIO_PORTFOLIO_RESEARCH_SOURCE_URLS` when configured. Fetch only public HTTPS references, record whether each source was fetched, store reusable layout principles in `portfolio-layout-research.json`/`.md`, and never fabricate or copy a URL or design.
- Use `sharp` image analysis before planning. Record dimensions, aspect ratio, orientation, file size, format, dominant color, brightness, quality risks, and recommended roles in `portfolio-source-audit.json`; small images, panoramic images, and dark image sets must affect ranking, theme, and layout choice.
- Record portfolio design/application references as internal context. Missing references are a warning; ordinary portfolio quality issues must go through automatic repair before any blocking status.
- Do not copy a specific portfolio design.
- Prefer restrained layouts, clear image priority, short captions, and mature spacing.
- The default cover is artist name, `Selected Works`, year, and contact/website only if available. Do not make the opportunity title the portfolio title.
- Show selected works clearly before detail/process/context views.
- Captions should normally include title, year/date, medium, dimensions or duration where known. Missing facts are omitted externally and recorded internally; do not write `unknown`, `N/A`, `TBD`, or "dimensions recorded in source material".
- Installation and series pages must distinguish overview, detail, installation, reverse/back, process, and context images. Do not squeeze many small images into a page.
- Default formal portfolios should use at least five meaningful layout strategies when material allows, including cover/statement/project opener plus image, grid, detail/context, installation/spread, selected works list, and contact/CV summary pages. No more than three consecutive pages may use the same layout strategy.
- Reusing an image once across a series overview and a primary/detail page is acceptable portfolio rhythm. Repeating the same image across multiple full-page or non-overview pages is overuse and must be repaired.
- Every formal portfolio image path must exist under `artist-assets/works/`, `artist-assets/source-materials/`, or `artist-assets/inbox/`, be readable by `sharp`, copy into `external-submission/images/` with a stable unique filename, and load in `portfolio.html`.
- If a planned image fails validation/copy/render but an alternate or safer layout can solve it, repair automatically. Only no usable images, no usable work data, non-omittable required metadata, login/payment/captcha/legal/privacy/eligibility/fee issues, or irreversible submission steps may block the user.
- After generation, check the rendered HTML/PDF for missing images, page count, file size, forbidden terms, too-small images, blank pages, caption readability, dense layouts, overlong captions, generic statement text, and whether the result ignores the artist's existing style.
- The visual gate must include aesthetic diagnostics for white-only monotony, repeated layout strategy, weak image/page ratio, dense captions, development words, missing hierarchy, HTML-preview language, and whether the output reads as a formal PDF.
- The visual report must also record layout strategy counts, theme counts, repeated runs, missing images, small-image pages, caption issues, `aestheticScore`, and `professionalPdfScore`. Scores below 85 trigger auto-repair and, if unresolved, `quality_blocked`.
- If visual/structure checks find ordinary issues such as page count, small image, dense grid, long caption, forbidden terms, file size, or layout balance, run up to three automatic repair rounds before deciding final status.
- Write `internal-notes/portfolio-auto-repair-log.json` with every repair round, issues found, repairs applied, page count changes, final status, remaining blocking issues, and warnings.
- The package writer must treat `external-submission/portfolio.pdf` as the primary external artifact. `portfolio.html` is an internal/preview support file for rendering and checks, and must not contain `TEST PREVIEW`, `Web preview`, `browser preview`, `mock`, `draft`, `placeholder`, `generated by AI`, `unknown`, `N/A`, or `TBD`.
- If Playwright cannot render the final PDF and the fallback text PDF is used, record that internally and do not mark the package professionally ready.
- When opportunity text requests a short portfolio, individual image upload, or combined PDF, the package writer should materialize the corresponding variant: `portfolio-short-10p.pdf`, `images-for-upload/`, or `combined-application-package.pdf`.
- The visual/structure report belongs in `internal-notes/portfolio-visual-check.json`, not in external files.
- `external-submission/` contains only formal submission files. `internal-notes/` contains source audits, repair logs, warnings, risks, and automatic judgments. `user-review/` gives the artist a final confirmation summary, not a page-by-page portfolio review task.

Research references used to define these rules included ExhibitFolio, Artists Collecting Society portfolio guidance, Carnegie Mellon MFA upload guidance, and residency statement guidance emphasizing specific work/program fit.
