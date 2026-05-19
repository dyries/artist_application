import fs from "node:fs";
import path from "node:path";
import { generatedApplicationsDir } from "./paths";
import { writeGeneratedDocuments } from "./documentOutputs";
import { recordPackageManifest } from "./db";
import type { Application, Opportunity } from "@/types/domain";

type PackageDraft = Pick<Application, "draftZh" | "draftEn" | "checklist" | "selectedWorks"> & {
  bioZh?: string;
  bioEn?: string;
  statementZh?: string;
  statementEn?: string;
  cvText?: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "application";
}

export function writeApplicationPackage(opportunity: Opportunity, app: PackageDraft) {
  fs.mkdirSync(generatedApplicationsDir, { recursive: true });
  const folder = path.join(generatedApplicationsDir, `${opportunity.id}-${slugify(opportunity.title)}`);
  fs.mkdirSync(folder, { recursive: true });

  const markdown = `# ${opportunity.title}

Organization: ${opportunity.organization}
URL: ${opportunity.url}
Deadline: ${opportunity.deadline}
Location: ${opportunity.location}

## Checklist

${app.checklist}

## English Draft

${app.draftEn}

## 中文草稿

${app.draftZh}

## Suggested Works

${app.selectedWorks}
`;

  const files = {
    applicationDraft: path.join(folder, "application-draft.md"),
    draftEn: path.join(folder, "draft-en.md"),
    draftZh: path.join(folder, "draft-zh.md"),
    checklist: path.join(folder, "checklist.md"),
    selectedWorks: path.join(folder, "selected-works.md"),
    opportunitySnapshot: path.join(folder, "opportunity.json"),
    manifest: path.join(folder, "package-manifest.json")
  };

  fs.writeFileSync(files.applicationDraft, markdown, "utf8");
  fs.writeFileSync(files.draftEn, app.draftEn, "utf8");
  fs.writeFileSync(files.draftZh, app.draftZh, "utf8");
  fs.writeFileSync(files.checklist, app.checklist, "utf8");
  fs.writeFileSync(files.selectedWorks, app.selectedWorks, "utf8");
  if (app.bioZh || app.bioEn) fs.writeFileSync(path.join(folder, "bio.md"), [app.bioZh, app.bioEn].filter(Boolean).join("\n\n---\n\n"), "utf8");
  if (app.statementZh || app.statementEn) fs.writeFileSync(path.join(folder, "statement.md"), [app.statementZh, app.statementEn].filter(Boolean).join("\n\n---\n\n"), "utf8");
  if (app.cvText) fs.writeFileSync(path.join(folder, "cv.md"), app.cvText, "utf8");
  fs.writeFileSync(files.opportunitySnapshot, JSON.stringify(opportunity, null, 2), "utf8");
  copySelectedImages(folder, app.selectedWorks);
  writeGeneratedDocuments(folder, {
    title: opportunity.title || "Application Package",
    subtitle: [opportunity.organization, opportunity.deadline, opportunity.url].filter(Boolean).join(" | "),
    sections: [
      { heading: "Checklist", body: app.checklist },
      { heading: "English Draft", body: app.draftEn },
      { heading: "Chinese Draft", body: app.draftZh },
      { heading: "Bio", body: [app.bioZh, app.bioEn].filter(Boolean).join("\n\n") },
      { heading: "Statement", body: [app.statementZh, app.statementEn].filter(Boolean).join("\n\n") },
      { heading: "CV", body: app.cvText ?? "" },
      { heading: "Selected Works", body: app.selectedWorks }
    ].filter((section) => section.body.trim().length > 0)
  });
  const manifest = {
    manifestVersion: 1,
    generatedAt: new Date().toISOString(),
    status: "draft",
    requiresUserReview: true,
    opportunity: {
      id: opportunity.id,
      title: opportunity.title,
      organization: opportunity.organization,
      url: opportunity.url,
      deadline: opportunity.deadline,
      location: opportunity.location,
      status: opportunity.status
    },
    packagePath: folder,
    files: {
      applicationDraft: path.basename(files.applicationDraft),
      draftEn: path.basename(files.draftEn),
      draftZh: path.basename(files.draftZh),
      checklist: path.basename(files.checklist),
      selectedWorks: path.basename(files.selectedWorks),
      opportunitySnapshot: path.basename(files.opportunitySnapshot),
      generatedDocuments: ["application-package.docx", "application-package.pdf"].filter((file) => fs.existsSync(path.join(folder, file))),
      imagesDir: fs.existsSync(path.join(folder, "images")) ? "images" : null
    },
    reviewRules: {
      bilingualReviewRequired: true,
      finalSubmissionLanguageMustFollowOpportunity: true,
      userEditsBecomeSourceOfTruth: true
    }
  };
  fs.writeFileSync(files.manifest, JSON.stringify(manifest, null, 2), "utf8");
  recordPackageManifest({
    opportunityId: opportunity.id,
    packagePath: folder,
    manifestPath: files.manifest,
    manifestVersion: manifest.manifestVersion,
    status: manifest.status
  });
  return folder;
}

function copySelectedImages(folder: string, selectedWorks: string) {
  const imageDir = path.join(folder, "images");
  const paths = selectedWorks
    .split("\n")
    .map((line) => line.match(/Image:\s*(.+)$/i)?.[1]?.trim())
    .filter((value): value is string => Boolean(value));

  for (const imagePath of paths) {
    if (!fs.existsSync(imagePath)) continue;
    fs.mkdirSync(imageDir, { recursive: true });
    fs.copyFileSync(imagePath, path.join(imageDir, path.basename(imagePath)));
  }
}
