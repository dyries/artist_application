# FRONTEND_STYLE_GUIDE.md

## Product feel

The interface should feel like a premium creative studio tool.

It should not look like:
- a generic SaaS dashboard
- a crypto dashboard
- a student project
- a default Tailwind template
- a plain CRUD admin panel

It should feel closer to:
- contemporary gallery archive
- art book index
- editorial portfolio system
- curated studio management software
- artist / gallery back office

## Visual direction

Use:
- off-white / warm white backgrounds
- muted black text
- warm gray borders
- restrained accent colors
- thin dividers
- generous whitespace
- strong typography hierarchy
- image-led layouts
- calm, precise, editorial composition

Avoid:
- bright blue/purple default SaaS colors
- random gradients
- glassmorphism
- heavy drop shadows
- excessive rounded corners
- emoji icons
- overdecorated cards
- dense visual noise

## Layout

Every page must have a clear structure:

1. Page title
2. Short description or context
3. Primary action
4. Main content
5. Secondary metadata/actions

Rules:
- do not center everything
- use max-width containers
- keep left alignment for most admin/editorial pages
- use consistent spacing
- avoid placing too many cards with equal visual weight
- avoid dense tables unless the data truly needs a table
- prefer gallery/archive layouts for artwork-heavy pages
- give artwork and portfolio previews visual priority

Spacing scale:
- 4px
- 8px
- 12px
- 16px
- 24px
- 32px
- 48px
- 64px
- 96px

Do not invent random spacing values.

## Typography

Use a restrained type system.

Suggested hierarchy:
- Page title: large, confident, not oversized
- Section label: small uppercase or subtle muted label
- Body text: readable, calm
- Metadata: smaller, muted, precise
- Captions: clear and art-world appropriate

Artwork caption format:

Title, Year
Medium
Dimensions

Example:

The Garden of Afterimages, 2024
Oil, acrylic, and image transfer on canvas
120 × 90 cm

Avoid:
- generic marketing hero copy
- huge SaaS headlines
- inconsistent font sizes
- text blocks wider than comfortable reading length
- metadata visually louder than artwork

## Color tokens

Use centralized design tokens.

Suggested palette:
- background: warm off-white
- surface: slightly lighter or darker warm white
- text: near black
- muted text: warm gray
- border: light warm gray
- accent: restrained dark red, olive, charcoal, or muted brown

Do not use raw random colors in page components.
Do not use blue as the default primary color unless explicitly requested.

## Components

Use a consistent component system.

Required reusable components:
- Button
- Input
- Textarea
- Select
- Card
- Badge
- Tabs
- Dialog
- Sidebar
- Topbar
- EmptyState
- ArtworkGrid
- ArtworkCard
- ArtworkDetailPanel
- OpportunityStatusBadge
- DeadlineIndicator
- PortfolioPreviewCard

Do not duplicate one-off component styles.

## Artwork pages

Artwork pages should feel like a gallery archive.

Requirements:
- responsive artwork grid
- image aspect ratios preserved
- no distorted images
- clean captions
- filters for series / year / medium / status
- detail panel or detail page
- clear availability / price / application-use metadata where relevant

Avoid:
- plain database table as the default artwork view
- tiny thumbnails
- cramped cards
- distorted images
- equal-weight metadata clutter

## Opportunity tracker pages

Opportunity pages should make deadlines and status obvious.

Requirements:
- status badges
- deadline indicators
- clear requirement checklist
- application package status
- filter by saved / preparing / submitted / accepted / rejected
- show missing materials clearly
- show why an opportunity was recommended

Avoid:
- visually flat lists with no hierarchy
- hiding deadlines
- forcing users to open each item to see basic requirements
- asking the user to manually compare hundreds of opportunities

## Portfolio PDF UI

Portfolio generation UI should emphasize output quality and automation.

Requirements:
- show selected opportunity
- show page count target
- show generated package status
- show missing metadata warnings
- show final export/submission action clearly
- separate internal notes from final public text
- show whether the aesthetic quality gate passed

Avoid:
- treating PDF generation as a simple file export button
- no preview of selected works/package status
- no warnings for missing title / year / medium / dimensions
- asking user to manually choose images, layouts, colors, or captions

## Responsive behavior

Desktop:
- use sidebar + main content where useful
- allow detail panels
- use generous grids

Mobile:
- collapse sidebar
- stack panels
- keep actions accessible
- no horizontal overflow

## Forbidden frontend behavior

Do not:
- add random new colors
- add random new font families
- use inline styles for repeated components
- create a different visual style on each page
- change business logic while doing visual refactors
- use placeholder lorem ipsum in final UI
- make the product look like a generic startup dashboard
