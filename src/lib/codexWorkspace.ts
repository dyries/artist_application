import fs from "node:fs";
import path from "node:path";
import { readArtistData } from "./db";
import {
  generatedCodexDir,
  generatedApplicationsDir,
  generatedFinalSubmissionsDir,
  generatedReportsDir,
  sourceMaterialsDir,
  worksDir
} from "./paths";

function writeJson(filePath: string, value: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

export function exportCodexWorkspace() {
  fs.mkdirSync(generatedCodexDir, { recursive: true });
  fs.mkdirSync(generatedApplicationsDir, { recursive: true });
  fs.mkdirSync(generatedFinalSubmissionsDir, { recursive: true });
  fs.mkdirSync(generatedReportsDir, { recursive: true });
  fs.mkdirSync(worksDir, { recursive: true });
  fs.mkdirSync(sourceMaterialsDir, { recursive: true });

  const data = readArtistData({
    materialLimit: 300,
    materialContentLimit: 6000,
    opportunityLimit: 300,
    opportunityRawContentLimit: 2000,
    applicationLimit: 200
  });
  const snapshotPath = path.join(generatedCodexDir, "artist-snapshot.json");
  const instructionsPath = path.join(generatedCodexDir, "automation-instructions.md");

  writeJson(snapshotPath, {
    exportedAt: new Date().toISOString(),
    lightweightSnapshot: true,
    counts: data.counts,
    profile: data.profile,
    applicationPreferences: {
      reviewLanguage: "zh-CN",
      automationBoundaryRule:
        "Users may choose Codex automation, project-internal external-model automation, or both. Codex automation runs inside Codex and must not depend on DeepSeek, Gemini, Claude, OpenAI API keys, or any project external API key. Project-internal external-model automation uses providers configured in .env.local when available. Both paths must respect user review and explicit confirmation boundaries.",
      maintenanceRule:
        "Whenever the user adds, changes, or corrects any workflow, application-package, material, or automation rule in conversation, update both project rules and Codex automation rules immediately. Application package rules must always follow the newest user-provided rules. Each code change must remove obsolete code, wording, interfaces, and rules unless explicitly kept for compatibility and documented as such.",
      userReviewEditRule:
        "User-facing application packages and review files are editable by the user. If the user edits any review draft, package file, DOCX/PDF, form answer, portfolio text, caption, checklist, or email draft, Codex automation must treat the edited file as the new source of truth and update downstream final submission files, database records, reports, and archive indexes accordingly. If the final submission language is English but the user edits the Chinese review draft, understand the Chinese edit as the user's content intent and synchronize it into the final English submission draft without inserting Chinese text into the English final file. Do not continue from stale pre-edit drafts.",
      manualOpportunityLinkRule:
        "The user may manually add exhibition, residency, open call, award, or other application page URLs. Treat these as user-provided unverified opportunities until Codex automation or project automation verifies source URL, deadline, eligibility, fees, funding, required materials, submission method, and risks. Project-internal automation may fetch user-provided pages with external providers such as DeepSeek, OpenAI, Gemini, Claude, or OpenAI-compatible APIs, but must mark pages that require login, captcha, payment, dynamic rendering, or manual verification. Do not apply or submit without user review and explicit confirmation.",
      applicantNationalityAndBase:
        "The artist is Chinese / China-based unless the profile says otherwise. Only recommend opportunities that explicitly allow Chinese nationals, China-based artists, international applicants, or applicants from any nationality. Reject or downgrade opportunities limited to another country's residents, citizens, or local artists unless the eligibility text clearly includes China.",
      preferredApplicationRegion:
        data.profile.applicationRegion || "worldwide",
      applicationRegionRule:
        "The user's preferred application region is stored in profile.applicationRegion and defaults to worldwide. Use it as a binding search and ranking preference: worldwide means search globally; any other value means prioritize opportunities physically based in that selected region or explicitly online/no-location opportunities. Do not confuse application region with the artist's current location.",
      automationBatchLimit:
        data.profile.automationBatchLimit || 5,
      submissionApprovalMode:
        data.profile.submissionApprovalMode || "review_required",
      automationBatchRule:
        "The user may choose how many opportunities to process in one run, from 1 to 100. Use profile.automationBatchLimit as the maximum number of opportunities to deeply process or prepare in a run unless the user gives a newer instruction.",
      submissionApprovalModeRule:
        "The user may choose review_required, review_optional, or direct_apply. review_required means every package must be reviewed before submission. review_optional means automation may prepare final files without a separate review package when requirements are clear, but should still ask before external submission. direct_apply means the user pre-authorizes submission for the current run up to the configured batch limit, but automation must still stop for payment, account login, captcha, sensitive authorization, unclear eligibility, unclear fees, missing required materials, or irreversible actions.",
      opportunitySelectionRule:
        "Do not merely find five residencies and five exhibitions. Build a larger verified candidate pool first, reject mismatches with clear reasons, then select the best Top 5 residencies and Top 5 exhibitions/open calls for review.",
      reviewBilingualRule:
        "All user-facing review materials must be Chinese-English bilingual, including form answers, bio, statement, project text, work descriptions, captions, checklist notes, and opportunity summaries. This bilingual rule is for user review only, never for final submission files.",
      portfolioQualityRule:
        "Portfolio work is a high-effort deliverable. Select works intentionally, inspect source materials when possible, and first show each selected work completely and clearly. Use installation/detail/process/context views only as supporting images when they improve understanding; they must not replace a complete view of the work. Material analysis must be based on AI actually reading, viewing, or listening to original content, including images, text, PDFs, Word documents, portfolios, audio, video, and future media types. Codex automation can inspect and analyze these materials directly; when project-internal automation is connected to a multimodal model API, it must pass original files or provider-supported file references as inputs and analyze the actual content. Extracted text, file names, paths, pixel dimensions, formats, DPI, audio/video duration, and other metadata are only indexing/QA aids and must never substitute for multimodal analysis. Write missing work notes/captions and produce a polished sequence/layout rather than a casual file bundle.",
      physicalWorkAvailabilityRule:
        "For exhibitions that require physical works, installation, shipping, or currently available objects, ask the user to confirm which works are still available before finalizing the application package.",
      cleanupRule:
        "After a package is finally submitted or explicitly marked final by the user, archive or delete intermediate drafts from that package folder and keep only final submission files, final review files, checklist, source notes needed for audit, and the submission log.",
      finalSubmissionLanguageRule:
        "Final submission files must use only the language required by the opportunity. If the opportunity is English, submit English-only files. If it is Chinese, submit Chinese-only files. If it asks for another language or explicitly asks for bilingual materials, follow that requirement. Do not include Chinese review translations in English final files, and do not include English review translations in Chinese final files.",
      searchAndCostPreferencesZh: data.profile.preferencesZh || data.profile.preferences,
      searchAndCostPreferencesEn: data.profile.preferencesEn || data.profile.preferences
    },
    works: data.works,
    cv: data.cv,
    materialSources: data.materialSources.map((source) => ({
      ...source,
      contentExcerpt: source.content,
      contentTruncated: source.content.length >= 6000,
      content: undefined
    })),
    currentOpportunities: data.opportunities,
    currentApplications: data.applications,
    directories: {
      sourceMaterialsDir,
      worksDir,
      generatedApplicationsDir,
      generatedFinalSubmissionsDir,
      generatedReportsDir
    }
  });

  fs.writeFileSync(
    instructionsPath,
    `# Codex Artist Automation

Use this workspace as the source of truth for an AI-led artist application workflow. The app stores materials and results; Codex performs the actual interpretation, writing, opportunity review, package preparation, and confirmed submission work.

## Automation Choices And Boundaries

- Users may choose Codex automation, project-internal external-model automation, or both.
- Codex automation runs inside Codex using Codex/OpenAI models. Do not require, read, or depend on project external model API keys such as DeepSeek, Gemini, Claude, or OpenAI API keys when running Codex automation.
- Project-internal external-model automation uses providers configured in \`.env.local\` when available. It may generate reports, verify manually added opportunity links from fetched source text, and draft packages inside the web app.
- When both paths are used, project-internal automation can handle fast drafts and first-pass organization while Codex handles higher-risk or more complex verification, material interpretation, file production, and user-confirmed submission steps.
- Never commit or share API keys.
- Default behavior requires explicit user confirmation before submitting forms or sending email. Direct-apply mode pre-authorizes eligible submissions in the current run up to the configured batch limit, but payment, account login, captcha, sensitive authorization, unclear eligibility, unclear fees, missing required materials, or irreversible actions still require pausing for user intervention.
- Respect \`profile.automationBatchLimit\` as the maximum number of opportunities to deeply process or prepare in one run unless the user gives a newer instruction. The value may range from 1 to 100.
- Respect \`profile.submissionApprovalMode\`: \`review_required\` requires review before submission; \`review_optional\` allows final-file preparation without a separate review package when requirements are clear; \`direct_apply\` means the user pre-authorizes submission for the current run up to the configured batch limit. Even in \`direct_apply\`, stop for payment, account login, captcha, sensitive authorization, unclear eligibility, unclear fees, missing required materials, or irreversible actions.

## Maintenance Rules

- Whenever the user adds, changes, or corrects any workflow rule, application-package rule, material rule, automation rule, or execution boundary in conversation, immediately update both project rules/documentation and the Codex automation instructions. Do not leave rules only in chat memory.
- Application package rules must always follow the latest user-provided rules, including opportunity screening, review language, review file format, portfolio quality, final submission language, final archive, submission confirmation, and draft cleanup.
- Every code change must remove or replace obsolete code, obsolete wording, old interfaces, and superseded rules. Do not leave dead branches or misleading legacy behavior behind.
- If an old interface or file is intentionally kept for compatibility, document the compatibility reason clearly; otherwise remove it.
- If project rules and Codex automation rules conflict, follow the newest user instruction and synchronize both rule sets immediately.

## User Review And Edit Rules

- In \`review_required\` mode, all generated application packages, review drafts, DOCX/PDF files, form answers, portfolio text, work descriptions, captions, checklists, and email drafts must be reviewed by the user before final submission.
- In \`review_optional\` mode, automation may prepare final files without a separate review package when requirements are clear, but should still ask before external submission.
- In \`direct_apply\` mode, the user has pre-authorized submission for the current run up to \`profile.automationBatchLimit\`; still stop for payment, account login, captcha, sensitive authorization, unclear eligibility, unclear fees, missing required materials, or irreversible actions.
- The user may manually edit any review file or application package file. After the user edits a file, that edited file becomes the new source of truth for the next automation step.
- If the final submission language is English and the user edits the Chinese review draft, treat the Chinese edit as the user's content intent and update the final English submission draft accordingly. Do not place Chinese review text into an English-only final submission file.
- After user edits, Codex automation must read the edited version and update downstream final submission files, database records, reports, and final archive indexes. Do not continue from stale pre-edit drafts.
- If a user edit conflicts with an opportunity requirement, safety boundary, or current project rule, explain the conflict and ask for confirmation before overriding or transforming the user's edit.

## Manual Opportunity Link Rules

- The user may manually add exhibition, residency, open call, award, or other application page URLs to the project.
- Treat user-provided links as unverified opportunities until the source page, deadline, eligibility, fees, funding, required materials, submission method, and risks have been checked.
- Manual links may be processed by Codex automation using Codex/OpenAI models or by the optional project-internal external-model automation using DeepSeek, OpenAI, Gemini, Claude, or OpenAI-compatible providers. Final applications and submissions still require user review and explicit confirmation.
- Project-internal automation may fetch user-provided opportunity pages and pass source text to the configured model. If fetching fails or the page requires login, captcha, payment, dynamic rendering, or sensitive authorization, flag the risk and ask for Codex/browser or user intervention.
- If a manual link requires login, captcha, payment, or sensitive authorization, pause and ask the user to intervene.

## Inputs

- Read the current artist profile, source materials, works, CV, opportunities, and applications from \`generated/codex/artist-snapshot.json\`.
- The snapshot is intentionally lightweight. Source materials include excerpts plus \`filePath\`; inspect the original PDF, Word document, text file, or image only when the excerpt is insufficient for a specific application.
- The live database is \`data/artist.sqlite\`.
- Work image assets belong in \`artist-assets/works/\`.
- Uploaded source PDFs, Word documents, images, and portfolios belong in \`artist-assets/source-materials/\`; paths are also listed in \`materialSources\`.
- Source material excerpts may contain extracted text and metadata such as path, pixel dimensions, file format, color space, DPI, audio/video duration, or system file information. Treat this as indexing only. For any selection, critique, portfolio layout, artwork identification, image-quality judgment, text interpretation, audio/video understanding, or final material decision, inspect the original material content directly through Codex multimodal analysis or, for project-internal automation, through a multimodal model API once connected.
- Files manually dropped by the user belong under \`artist-assets/inbox/\` by category. Scan or inspect those files when the user says new materials were added.
- Final submitted or user-approved submission files must be copied into \`generated/final-submissions/YYYY-MM-DD/\` for long-term lookup.
- Do not rely on rule-based generators for CV, statements, work lists, or application text. Read and reason over the materials directly.

## AI Responsibilities

- Whenever the user corrects or improves the workflow, application package rules, material handling, automation behavior, or execution boundaries, immediately update both the project rules/documentation and the generated Codex automation instructions. Do not leave new rules only in chat memory.
- Organize new source materials into a clean artist profile, CV, bios, artist statements, works, work descriptions, portfolio notes, and application preferences.
- Preserve useful source details and flag ambiguities instead of inventing facts.
- Search for relevant artist residencies, exhibition open calls, grants, awards, and other application opportunities that match the artist profile and preferences.
- Respect the user's selected application region from \`profile.applicationRegion\`. It defaults to \`worldwide\`; when set to another region, prioritize opportunities physically based in that region or explicitly online/no-location opportunities, and do not confuse this with the artist's current location.
- Search broadly each run. Use multiple Chinese and English keyword sets, regional sources, institution websites, official open call pages, and artist opportunity platforms. Build a larger verified candidate pool before selecting the final recommendations; do not stop after finding the first five items in either category.
- Treat the artist as Chinese / China-based unless the profile says otherwise. Confirm eligibility for Chinese nationals, China-based artists, international applicants, or all nationalities before recommending an opportunity. Reject or clearly downgrade opportunities limited to another country's citizens, residents, local artists, or region-specific applicants when China is not included.
- Rank outputs in two groups: Top 5 residencies and Top 5 exhibitions/open calls. These Top 5 lists must be selected from the broader candidate pool based on eligibility, artistic fit, cost, deadline, credibility, and required materials. If fewer than five qualified opportunities are available in a group, document the searched scope, rejected reasons, and closest fallback candidates.
- Treat cost coverage as a major filter. Prefer opportunities with no application fee and full cost coverage by the organizer.
- Exhibitions may have a reasonable application fee, but deprioritize or reject opportunities with booth fees, participation fees, venue/wall fees, mandatory production fees, or pay-to-show economics.
- Residencies may require the artist to pay airfare/international travel, but lodging, studio/project space, and basic program costs should be covered by the organizer. Prefer residencies with stipend, production budget, per diem, materials support, regional transport, or other funding.
- Deprioritize or reject residencies that require the artist to pay lodging, program fees, or high participation fees unless the artistic fit is exceptional; clearly flag the cost risk.
- Use the artist profile preferences in the snapshot as binding screening criteria when ranking opportunities.

For each candidate:

- Verify the source URL and deadline.
- Extract organization, location, eligibility, fees, funding, required materials, and submission method.
- Explicitly state whether Chinese nationals / China-based artists / international applicants are eligible, and cite the eligibility language or note when it is unclear.
- Break out the cost structure: application fee, booth/participation/program fee, lodging, studio, production costs, stipend/award/funding, and whether travel is covered.
- Score fit from 0 to 100.
- Record risks such as fees, geographic limits, missing deadline, unclear organizer, or mismatch with the artist's medium.
- Write strong candidates back to the \`opportunities\` table in \`data/artist.sqlite\`.

For high-fit opportunities:

- Use the source materials, CV, works, bio, and statement to tailor the package to the opportunity's requirements.
- When source material has a \`filePath\`, inspect the original PDF, Word document, or image when the extracted text is incomplete.
- Select the strongest relevant works for the requested medium, theme, eligibility, and file/material list. Portfolio preparation must be treated as a primary deliverable: inspect available image files, choose a complete and clear primary image for each selected work, sequence works deliberately, write or improve captions and work notes, and avoid weak filler images.
- Material analysis must be multimodal, not extraction/metadata-only. Codex automation may open, read, view, and analyze original materials directly. Project-internal external-model automation must do the same after a multimodal API is connected by sending original files or supported file references to the model. Do not decide whether an image is a complete work view, detail, installation shot, process image, cropped fragment, weak photo, final portfolio candidate, meaningful text source, or relevant audio/video source from extracted text or metadata alone.
- Every selected work should first be represented by a complete view of the work itself, unless the work is inherently durational, site-specific, or impossible to show in a single full view. Do not substitute only detail shots, process shots, cropped fragments, or atmospheric installation photos for the complete work.
- When a work has many available photos, choose the image set hierarchically: first complete work view, then supporting installation/scale/context/detail/process/alternate-angle images only if they add clarity. Prioritize complete representation and visual strength over simply adding more images, while still respecting any page/file-size limits from the opportunity.
- Before designing a new portfolio, inspect existing portfolio files in the material library, especially old PDFs/documents under \`artist-assets/inbox/portfolio/\` and \`artist-assets/source-materials/\`. Use those files as the primary layout reference for page rhythm, image scale, caption style, margins, and overall pacing instead of inventing an unrelated layout from scratch.
- Portfolio layout must look professional and readable: strong cover or title page when appropriate, consistent margins, image-first pages, restrained text, captions aligned consistently, no stretched/cropped-badly images, no cramped grids, no random image sizes, no ugly default document layout, and no filler pages.
- Portfolio captions must separate title, year, medium, and dimensions. Artwork dimensions must be written in centimeters (\`cm\`) or clearly marked as \`cm to be confirmed\`; do not present image pixel dimensions as artwork dimensions. Pixel dimensions, file sizes, and source image technical details belong only in internal image-selection notes or QA records, not in the final-facing portfolio layout.
- For exhibitions that require real physical works, shipping, installation, or currently available pieces, pause before finalizing and ask the user which works are still available. Old works are not assumed to still be in the artist's possession.
- Write opportunity-specific CV, bio, artist statement, work list, portfolio text, checklist, email draft, and application answers.
- Produce application-ready files in the requested formats when possible: PDF, DOCX/Word, Markdown text, and copied image assets.
- Do not provide user-facing review materials only as Markdown. Prefer DOCX for review files and add PDF previews when useful.
- All user-facing review materials must be Chinese-English bilingual, not just the opportunity summary. Include bilingual versions of form answers, bio, artist statement, project text, work descriptions, captions, checklist notes, and any other text the user needs to approve.
- User-facing review files are editable by the user. If the user modifies a review draft or package file, use that edited file as the basis for the final submission version and update related records.
- User edits to Chinese review files are binding even when the final submission is English-only; translate and synchronize the edited meaning into the final English file.
- Final submission materials are separate from review materials. The final package must use only the language requested by the opportunity: English-only for English calls, Chinese-only for Chinese calls, or another/bilingual format only when the opportunity explicitly asks for it. Do not mix review translations into final submission files.
- Name review and submission files separately, for example \`review-zh.docx\` and \`submission-en.docx\`.
- Prepare a draft application package under \`generated/applications/\`.
- Add a row to the \`applications\` table with draft text, checklist, selected works, and package path.
- Write a summary report under \`generated/reports/\`.

## Review and Submission

- Follow \`profile.submissionApprovalMode\` for each application package before submission.
- Write user-facing review summaries in Chinese by default, grouped as Top 5 residencies and Top 5 exhibitions/open calls, with cost coverage and risks clearly stated.
- For opportunity review, include bilingual Chinese-English summaries so the user can understand the opportunity and still inspect the English terms that may be used in final materials.
- Before asking for approval, do a final check for eligibility, deadline, timezone, fees, required files, word limits, file names, image requirements, and missing fields.
- After the user explicitly confirms submission, Codex may send email, fill web forms, upload attachments, and update the submission log when the required tools/session are available.
- After final submission or after the user marks a package as final, copy the final submission files into \`generated/final-submissions/YYYY-MM-DD/\`. File names must include the date, opportunity slug, and original file role/name, for example \`2026-05-18_residency-triangle-asterides-2027_submission-en.pdf\`.
- Each dated final-submissions folder must include or update a \`README.md\` index listing date, opportunity type, full application/opportunity project name, source application folder, final file names, and submission status when known. The project name must be human-readable, not only a slug.
- After the final archive copy is complete, clean the package folder: remove or archive earlier drafts and keep only the final submitted files needed in place. Do not leave review drafts, preview images, contact sheets, image-selection notes, old asset folders, source HTML, or archived old versions mixed with final files.
- Ask the user to take over for captcha, payment, account login, sensitive authorization, or anything that cannot be completed safely through the available tools.

## Boundaries

- Follow profile.submissionApprovalMode before sending email or submitting web forms. Payment, account login, captcha, sensitive authorization, unclear eligibility, unclear fees, missing required materials, or irreversible actions still require pausing for user intervention.
- Prefer adding reports and application packages over overwriting existing user material.
`,
    "utf8"
  );

  return { snapshotPath, instructionsPath };
}
