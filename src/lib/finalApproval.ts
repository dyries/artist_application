import fs from "node:fs";
import path from "node:path";
import { generatedFinalSubmissionsDir } from "./paths";
import type { Application, Opportunity } from "@/types/domain";

const hardStopPattern = /\b(payment|pay|login|account|captcha|legal|privacy|sensitive authorization|signature|declaration)\b/i;

export function archiveApprovedSubmission(application: Application, opportunity: Opportunity | null) {
  const packagePath = application.packagePath;
  const externalDir = path.join(packagePath, "external-submission");
  if (!fs.existsSync(externalDir)) {
    throw new Error("Cannot approve final package because external-submission is missing.");
  }

  const manifestPath = path.join(packagePath, "package-manifest.json");
  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) as { status?: string; readiness?: { opportunityVerification?: { issues?: string[] } } }
    : {};
  if (manifest.status !== "package_ready_for_final_review") {
    throw new Error(`Cannot approve final package while manifest status is ${manifest.status || "missing"}.`);
  }

  const date = new Date().toISOString().slice(0, 10);
  const archiveDir = uniqueArchiveDir(path.join(
    generatedFinalSubmissionsDir,
    date,
    `${application.id}-${slugify(opportunity?.title || "application")}`
  ));
  fs.mkdirSync(archiveDir, { recursive: true });
  copyDirectory(externalDir, path.join(archiveDir, "external-submission"));

  const nextActionPlan = buildNextActionPlan(opportunity, manifest);
  const index = {
    archivedAt: new Date().toISOString(),
    applicationId: application.id,
    opportunityId: application.opportunityId,
    opportunityTitle: opportunity?.title || "",
    packagePath,
    archivedExternalSubmission: "external-submission",
    nextActionPlan
  };
  fs.writeFileSync(path.join(archiveDir, "index.json"), JSON.stringify(index, null, 2), "utf8");
  fs.writeFileSync(path.join(archiveDir, "README.md"), renderArchiveReadme(index), "utf8");
  fs.writeFileSync(path.join(packagePath, "final-approval-archive.json"), JSON.stringify({
    archiveDir,
    nextActionPlan
  }, null, 2), "utf8");
  return { archiveDir, nextActionPlan };
}

function buildNextActionPlan(opportunity: Opportunity | null, manifest: { readiness?: { opportunityVerification?: { issues?: string[] } } }) {
  const method = opportunity?.submissionMethod || "unknown";
  const riskText = `${opportunity?.risks || ""}\n${manifest.readiness?.opportunityVerification?.issues?.join("\n") || ""}`;
  const hardStops = [...new Set((riskText.match(hardStopPattern) || []).map((item) => item.toLowerCase()))];
  if (hardStops.length) {
    return {
      status: "blocked",
      method,
      hardStops,
      steps: [
        "Do not submit automatically.",
        "Open the official opportunity page and resolve the listed hard stop manually.",
        "After the stop is resolved, use the archived external-submission files as the final source."
      ]
    };
  }
  if (method === "email") {
    return {
      status: "ready_for_manual_send",
      method,
      hardStops: [],
      steps: [
        "Create the submission email to the official recipient.",
        "Use external-submission/email-en.md as the body when present.",
        "Attach portfolio.pdf and required files from external-submission."
      ]
    };
  }
  if (method === "web_form") {
    return {
      status: "ready_for_web_form",
      method,
      hardStops: [],
      steps: [
        "Open the official web form.",
        "Copy answers from external-submission/application-answers-en.md when present.",
        "Upload portfolio.pdf and required files from external-submission.",
        "Stop before any final irreversible submit button unless the user explicitly confirms that action."
      ]
    };
  }
  return {
    status: "blocked",
    method,
    hardStops: ["unknown submission method"],
    steps: [
      "Confirm whether the opportunity requires email, web form, or another submission method.",
      "Use the archived external-submission files only after the method is clear."
    ]
  };
}

function renderArchiveReadme(input: {
  archivedAt: string;
  applicationId: number;
  opportunityId: number;
  opportunityTitle: string;
  packagePath: string;
  archivedExternalSubmission: string;
  nextActionPlan: ReturnType<typeof buildNextActionPlan>;
}) {
  return [
    `# Final Submission Archive`,
    "",
    `Archived at: ${input.archivedAt}`,
    `Application: ${input.applicationId}`,
    `Opportunity: ${input.opportunityTitle || input.opportunityId}`,
    `Source package: ${input.packagePath}`,
    "",
    "## Files",
    `- ${input.archivedExternalSubmission}/`,
    "- index.json",
    "",
    "## Next Action",
    `Status: ${input.nextActionPlan.status}`,
    `Method: ${input.nextActionPlan.method}`,
    input.nextActionPlan.hardStops.length ? `Hard stops: ${input.nextActionPlan.hardStops.join(", ")}` : "Hard stops: none recorded",
    "",
    ...input.nextActionPlan.steps.map((step) => `- ${step}`)
  ].join("\n");
}

function copyDirectory(source: string, target: string) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) copyDirectory(sourcePath, targetPath);
    else if (entry.isFile()) fs.copyFileSync(sourcePath, targetPath);
  }
}

function uniqueArchiveDir(base: string) {
  if (!fs.existsSync(base)) return base;
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${base}-${index}`;
    if (!fs.existsSync(candidate)) return candidate;
  }
  throw new Error("Could not allocate final submission archive directory.");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "application";
}
