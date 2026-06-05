import { execFileSync } from "node:child_process";

const REQUIRED_MESSAGE =
  "This change modifies project files but does not update WORKLOG.md. Please append a WORKLOG.md entry before finishing.";

const ignoredPathParts = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "out",
  "coverage",
  "tmp",
  "temp",
  ".tmp",
  ".temp",
  ".turbo",
  ".cache",
]);

function gitLines(args) {
  const output = execFileSync("git", args, { encoding: "utf8" });
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function isIgnored(filePath) {
  return filePath
    .split("/")
    .some((part) => ignoredPathParts.has(part) || part.endsWith(".tmp"));
}

const changedFiles = new Set([
  ...gitLines(["diff", "--name-only"]),
  ...gitLines(["diff", "--cached", "--name-only"]),
  ...gitLines(["ls-files", "--others", "--exclude-standard"]),
]);

const relevantFiles = [...changedFiles].filter((filePath) => !isIgnored(filePath));

if (relevantFiles.length === 0) {
  console.log("No changed project files detected. WORKLOG.md check passed.");
  process.exit(0);
}

const changedNonWorklogFiles = relevantFiles.filter((filePath) => filePath !== "WORKLOG.md");
const worklogChanged = relevantFiles.includes("WORKLOG.md");

if (changedNonWorklogFiles.length === 0) {
  console.log("Only WORKLOG.md changed. WORKLOG.md check passed.");
  process.exit(0);
}

if (worklogChanged) {
  console.log("Project files changed and WORKLOG.md was updated. WORKLOG.md check passed.");
  process.exit(0);
}

console.error(REQUIRED_MESSAGE);
process.exit(1);
