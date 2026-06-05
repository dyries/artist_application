# UI_ACCEPTANCE_CHECKLIST.md

Before submitting frontend changes, verify every item.

## General

- [ ] The page has a clear title and purpose.
- [ ] The visual hierarchy is obvious.
- [ ] The page does not look like a generic SaaS template.
- [ ] The page follows FRONTEND_STYLE_GUIDE.md.
- [ ] The layout is calm, editorial, and suitable for an art/studio tool.
- [ ] The interface supports the two-review-node automation model.

## Automation model

- [ ] The UI does not introduce extra review steps.
- [ ] The user is not asked to manually choose portfolio images.
- [ ] The user is not asked to manually select layouts.
- [ ] The user is not asked to manually select colors.
- [ ] The user is not asked to approve captions one by one.
- [ ] The user is not asked to inspect every portfolio page.
- [ ] Ordinary portfolio quality issues are presented as automatic repair or quality gate results, not as user chores.

## Spacing and layout

- [ ] Spacing uses the approved scale.
- [ ] Content is not cramped.
- [ ] Sections have clear separation.
- [ ] Alignment is consistent.
- [ ] The layout works on desktop.
- [ ] The layout works on mobile.
- [ ] There is no horizontal overflow.
- [ ] Artwork and portfolio previews have enough visual space.

## Typography

- [ ] Page title, section labels, body text, metadata, and captions are visually distinct.
- [ ] Text is readable.
- [ ] Metadata is not visually louder than primary content.
- [ ] Artwork captions follow a consistent format.
- [ ] The typography feels editorial, not generic SaaS.

## Colors

- [ ] Colors come from design tokens.
- [ ] There are no random raw colors.
- [ ] There is no default blue/purple SaaS styling.
- [ ] Contrast is readable.
- [ ] Accent colors are restrained and suitable for an art/studio product.

## Components

- [ ] Reusable components are used.
- [ ] No duplicated one-off card/button/input styles.
- [ ] Buttons have consistent variants.
- [ ] Badges have consistent status meanings.
- [ ] Empty states exist.
- [ ] Loading states exist.
- [ ] Error states exist where relevant.

## Artwork handling

- [ ] Artwork images are not stretched or distorted.
- [ ] Artwork grid is visually balanced.
- [ ] Captions are clear.
- [ ] Missing artwork metadata is surfaced.
- [ ] Artwork-heavy pages feel like an archive/gallery, not a spreadsheet.

## Opportunity review

- [ ] Recommended opportunities are shown as a shortlist, not a huge unfiltered dump.
- [ ] Each recommended opportunity explains fit clearly.
- [ ] Deadline, location, eligibility, fee, and requirements are visible.
- [ ] The user can choose opportunities without manually reviewing hundreds of raw results.

## Portfolio / PDF workflow

- [ ] Portfolio output quality is prioritized.
- [ ] Page count target is visible where relevant.
- [ ] Aesthetic/professional PDF gate status is visible where relevant.
- [ ] Auto-repair status is visible where relevant.
- [ ] Selected works/package summary is visible before final approval.
- [ ] Missing metadata warnings are visible.
- [ ] No draft/preview/test language appears in final output.
- [ ] The UI does not ask the user to make portfolio design decisions.

## Final submission review

- [ ] The final review presents a complete package status.
- [ ] The user can approve or request revision.
- [ ] True blockers are clearly separated from warnings.
- [ ] The user is not responsible for fixing ordinary design/layout problems.

## Final report

When done, report:
- checklist result
- files changed
- screenshots or visual verification notes
- remaining UI risks
