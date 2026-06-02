import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { NextRequest } from "next/server";

const workspace = await fs.promises.mkdtemp(path.join(os.tmpdir(), "artist-studio-fixture-"));
process.env.ARTIST_STUDIO_WORKSPACE_ROOT = workspace;
process.env.ARTIST_STUDIO_SKIP_PORTFOLIO_SCREENSHOTS = "1";
process.env.ARTIST_STUDIO_FAST_PORTFOLIO_PDF = "1";
process.env.ARTIST_STUDIO_AUTH_USER = "artist";
process.env.ARTIST_STUDIO_AUTH_PASSWORD = "secret";
delete process.env.ARTIST_STUDIO_API_TOKEN;

for (const dir of [
  "artist-assets/works",
  "artist-assets/source-materials",
  "artist-assets/inbox",
  "generated/applications",
  "generated/final-submissions",
  "generated/reports",
  "data"
]) {
  await fs.promises.mkdir(path.join(workspace, dir), { recursive: true });
}

const { middleware } = await import("../middleware.ts");
const { saveArtistData, readArtistData, upsertOpportunity, updateOpportunityStatus, createApplication } = await import("../src/lib/db.ts");
const { writeApplicationPackage } = await import("../src/lib/package.ts");
const { archiveApprovedSubmission } = await import("../src/lib/finalApproval.ts");

const unauthenticated = middleware(new NextRequest("https://artist.example.com/api/artist"));
assert.equal(unauthenticated.status, 401);

const basic = Buffer.from("artist:secret").toString("base64");
const authenticated = middleware(new NextRequest("https://artist.example.com/api/artist", {
  headers: { authorization: `Basic ${basic}` }
}));
assert.equal(authenticated.status, 200);

const local = middleware(new NextRequest("http://localhost:3000/api/artist"));
assert.equal(local.status, 200);

const worksDir = path.join(workspace, "artist-assets", "works");
const imagePaths = [];
for (let index = 0; index < 14; index += 1) {
  const imagePath = path.join(worksDir, `fixture-work-${String(index + 1).padStart(2, "0")}.jpg`);
  await sharp({
    create: {
      width: index % 2 ? 2300 : 2600,
      height: index % 3 ? 1700 : 1500,
      channels: 3,
      background: { r: 120 + index * 5, g: 135 + index * 4, b: 145 + index * 3 }
    }
  }).jpeg({ quality: 90 }).toFile(imagePath);
  imagePaths.push(imagePath);
}

const profile = {
  id: 1,
  name: "Fixture Artist",
  nameZh: "测试艺术家",
  nameEn: "Fixture Artist",
  email: "fixture@example.com",
  location: "Shanghai",
  locationZh: "上海",
  locationEn: "Shanghai",
  website: "https://fixture.example.com",
  instagram: "",
  bioZhShort: "",
  bioZhMedium: "",
  bioZhLong: "",
  bioEnShort: "",
  bioEnMedium: "",
  bioEnLong: "",
  statementZh: "",
  statementEn: "Fixture Artist works with painting, installation documentation, and image research through concrete arrangements of surfaces, archival fragments, and repeated public symbols.",
  preferences: "",
  preferencesZh: "",
  preferencesEn: "",
  applicationRegion: "worldwide",
  automationBatchLimit: 5,
  submissionApprovalMode: "review_required",
  opportunityFeePreference: "conservative",
  opportunityTierPreference: "high_tier",
  updatedAt: ""
};

const works = imagePaths.map((imagePath, index) => {
  const group = ["Archive Surface", "Signal Study", "Room Index", "Civic Mark", "Painted Record", "Threshold Array", "Image Table"][index % 7];
  return {
    id: index + 1,
    title: `${group} ${index + 1}`,
    titleZh: "",
    titleEn: `${group} ${index + 1}`,
    year: String(2021 + (index % 5)),
    medium: index % 4 === 0 ? "Installation documentation" : index % 3 === 0 ? "Image research and print" : "Oil on canvas",
    mediumZh: "",
    mediumEn: index % 4 === 0 ? "Installation documentation" : index % 3 === 0 ? "Image research and print" : "Oil on canvas",
    dimensions: `${70 + index} x ${50 + index} cm`,
    dimensionsZh: "",
    dimensionsEn: `${70 + index} x ${50 + index} cm`,
    imagePath,
    descriptionZh: "",
    descriptionEn: ""
  };
});

saveArtistData({
  profile,
  works,
  cv: [],
  materialSources: [{
    id: 1,
    kind: "portfolio",
    title: "Fixture existing portfolio notes",
    content: works.map((work) => work.title).join("\n"),
    analysis: "",
    fileName: "portfolio-notes.txt",
    filePath: path.join(workspace, "artist-assets", "source-materials", "portfolio-notes.txt"),
    mimeType: "text/plain",
    createdAt: "",
    updatedAt: ""
  }]
});

const sourceText = [
  "Fixture Foundation open call.",
  "Location: Online.",
  "Deadline: 2026-12-31.",
  "Fee: Free.",
  "Funding: No funding listed.",
  "Eligibility: International artists may apply.",
  "Materials: Submit a formal portfolio PDF and an email cover note.",
  "Submission method: email."
].join("\n");
upsertOpportunity({
  title: "Fixture Foundation Open Call",
  organization: "Fixture Foundation",
  url: "https://fixture.example.com/open-call",
  location: "Online",
  deadline: "2026-12-31",
  fee: "Free",
  funding: "No funding listed",
  eligibility: "International artists may apply",
  materials: "Submit a formal portfolio PDF and an email cover note.",
  submissionMethod: "email",
  summary: "Source page reviewed for fixture package.",
  score: 92,
  risks: "",
  status: "recommended",
  source: "fixture",
  rawContent: sourceText
});

let data = readArtistData({ materialLimit: 20, opportunityLimit: 20, opportunityRawContentLimit: 10000 });
const opportunity = data.opportunities.find((item) => item.url === "https://fixture.example.com/open-call");
assert.ok(opportunity);
updateOpportunityStatus(opportunity.id, "selected_by_user");
data = readArtistData({ materialLimit: 20, opportunityLimit: 20, opportunityRawContentLimit: 10000 });
const selectedOpportunity = data.opportunities.find((item) => item.id === opportunity.id);
assert.equal(selectedOpportunity.status, "selected_by_user");

const draft = {
  draftZh: "中文审核摘要",
  draftEn: "Formal answer.",
  checklist: "Portfolio PDF and email note.",
  selectedWorks: "",
  externalApplicationAnswersEn: "Formal answer.",
  emailDraftEn: "Dear Fixture Foundation,\n\nPlease find attached the portfolio PDF and application materials for the open call. The submitted works include painting, image research, and installation documentation from recent projects.\n\nBest regards,\nFixture Artist",
  portfolioWebResearchReferences: ["reference one", "reference two", "reference three"]
};
const written = writeApplicationPackage(selectedOpportunity, draft, {
  runMode: "real",
  materialSources: data.materialSources,
  profile: data.profile,
  works: data.works
});
const manifestPath = path.join(written.folder, "package-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
assert.equal(manifest.status, "package_ready_for_final_review");
assert.equal(manifest.readiness.passed, true);
assert.equal(manifest.opportunityVerification.passed, true);
assert.ok(fs.existsSync(path.join(written.folder, "external-submission", "portfolio.pdf")));
assert.ok(manifest.portfolio.actualPageCount >= 16 && manifest.portfolio.actualPageCount <= 24);

const blocked = writeApplicationPackage({ ...selectedOpportunity, id: selectedOpportunity.id + 1, title: "Blocked Fixture" }, {
  ...draft,
  externalApplicationAnswersEn: [
    "draft placeholder generated by AI internal note",
    "draft placeholder generated by AI internal note",
    "draft placeholder generated by AI internal note",
    "draft placeholder generated by AI internal note",
    "draft placeholder generated by AI internal note",
    "draft placeholder generated by AI internal note"
  ].join("\n")
}, {
  runMode: "real",
  materialSources: data.materialSources,
  profile: data.profile,
  works: data.works
});
const blockedManifest = JSON.parse(fs.readFileSync(path.join(blocked.folder, "package-manifest.json"), "utf8"));
assert.equal(blockedManifest.status, "quality_blocked");
assert.ok(blockedManifest.readiness.issues.some((issue) => issue.includes("became too short after sanitizer")));

const applicationId = createApplication({
  opportunityId: selectedOpportunity.id,
  runMode: "real",
  boundaryModel: "internal_notes/user_review/external_submission",
  draftZh: draft.draftZh,
  draftEn: draft.externalApplicationAnswersEn,
  checklist: draft.checklist,
  selectedWorks: "",
  packagePath: written.folder,
  submissionLog: "Package generated for final review."
});
const archive = archiveApprovedSubmission({
  id: applicationId,
  opportunityId: selectedOpportunity.id,
  runMode: "real",
  boundaryModel: "internal_notes/user_review/external_submission",
  draftZh: draft.draftZh,
  draftEn: draft.externalApplicationAnswersEn,
  checklist: draft.checklist,
  selectedWorks: "",
  packagePath: written.folder,
  submissionLog: "",
  createdAt: "",
  updatedAt: ""
}, selectedOpportunity);
assert.ok(fs.existsSync(path.join(archive.archiveDir, "README.md")));
assert.ok(fs.existsSync(path.join(archive.archiveDir, "index.json")));
assert.ok(fs.existsSync(path.join(archive.archiveDir, "external-submission", "portfolio.pdf")));
assert.equal(archive.nextActionPlan.method, "email");
assert.equal(archive.nextActionPlan.status, "ready_for_manual_send");

await fs.promises.rm(workspace, { recursive: true, force: true });
