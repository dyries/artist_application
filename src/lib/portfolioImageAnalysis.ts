import fs from "node:fs";
import path from "node:path";
import childProcess from "node:child_process";
import type { PortfolioImageAnalysis, PortfolioImageRole } from "@/types/domain";

const supportOnlyPattern = /detail|closeup|close-up|crop|cropped|process|install|installation|studio|temp|temporary|screenshot|screen|archive|reference|packing|backup|partial/i;

export function analyzePortfolioImages(imagePaths: string[]): PortfolioImageAnalysis[] {
  const uniquePaths = [...new Set(imagePaths)].filter((imagePath) => imagePath && fs.existsSync(imagePath));
  if (!uniquePaths.length) return [];
  try {
    const code = `
      const fs = require("node:fs");
      const path = require("node:path");
      const sharp = require("sharp");
      const paths = ${JSON.stringify(uniquePaths)};
      const toHex = (value) => Math.max(0, Math.min(255, Math.round(value || 0))).toString(16).padStart(2, "0");
      const orientationFor = (width, height) => {
        const ratio = width / Math.max(1, height);
        if (ratio > 2.35) return "panorama";
        if (ratio < 0.72) return "portrait";
        if (ratio > 1.28) return "landscape";
        return "square";
      };
      const brightnessLabelFor = (brightness) => brightness < 0.3 ? "dark" : brightness > 0.78 ? "bright" : "balanced";
      const supportSignalsFor = (imagePath) => {
        const lower = path.basename(imagePath).toLowerCase();
        return {
          cropRisk: /detail|closeup|close-up|crop|cropped|partial/.test(lower),
          partialImageRisk: /detail|closeup|close-up|crop|cropped|partial|fragment|edge/.test(lower),
          temporaryPhotoRisk: /process|studio|temp|temporary|screenshot|screen|packing|backup/.test(lower),
          installationRisk: /install|installation|view|space/.test(lower),
          archiveRisk: /archive|reference|research/.test(lower),
          completeSignal: /complete|full|final|documentation|documented|primary|work|artwork|作品完整|完整/.test(lower) || /artist-assets\\/works|\\/works\\//.test(lower)
        };
      };
      const completeWorkScoreFor = (analysis) => {
        const signals = supportSignalsFor(analysis.path);
        let score = 52;
        if (signals.completeSignal) score += 22;
        if (/artist-assets\\/works|\\/works\\//.test(analysis.path.toLowerCase())) score += 8;
        if (Math.max(analysis.width, analysis.height) >= 2400 && Math.min(analysis.width, analysis.height) >= 1400) score += 12;
        else if (Math.max(analysis.width, analysis.height) >= 2000 && Math.min(analysis.width, analysis.height) >= 1400) score += 10;
        else if (Math.max(analysis.width, analysis.height) < 1600 || Math.min(analysis.width, analysis.height) < 900) score -= 20;
        if (analysis.aspectRatio > 3.2 || analysis.aspectRatio < 0.42) score -= 14;
        if (analysis.averageBrightness < 0.16 || analysis.averageBrightness > 0.94) score -= 8;
        if (signals.cropRisk) score -= 35;
        if (signals.partialImageRisk) score -= 25;
        if (signals.temporaryPhotoRisk) score -= 28;
        if (signals.installationRisk) score -= 18;
        if (signals.archiveRisk) score -= 20;
        if (analysis.tooSmallForFullPage) score -= 15;
        return Math.max(0, Math.min(100, Math.round(score)));
      };
      const suitabilityFor = (analysis) => {
        if (analysis.supportOnly) return "detail_only";
        if (!analysis.width || !analysis.height) return "exclude";
        if (analysis.tooSmallForFullPage || (analysis.fileSizeBytes < 120 * 1024 && analysis.completeWorkScore < 70)) return "detail_only";
        if (analysis.orientation === "panorama") return "usable";
        if (analysis.completeWorkScore >= 78 && Math.max(analysis.width, analysis.height) >= 2400 && Math.min(analysis.width, analysis.height) >= 1400 && analysis.averageBrightness >= 0.22 && analysis.averageBrightness <= 0.88) return "strong";
        return "usable";
      };
      const rolesFor = (analysis) => {
        const lower = analysis.path.toLowerCase();
        const roles = [];
        if (/temp|temporary/.test(lower)) roles.push("temporary");
        if (/crop|cropped/.test(lower)) roles.push("cropped");
        if (/partial|fragment/.test(lower)) roles.push("partial");
        if (/install|installation|view|space/.test(lower)) roles.push("installation_view");
        if (/detail|close|closeup|crop/.test(lower)) roles.push("detail");
        if (/process|studio|material/.test(lower)) roles.push("process");
        if (/archive|reference|research/.test(lower)) roles.push("archive_reference");
        if (analysis.fullPageSuitability === "exclude") roles.push("excluded");
        else if (analysis.supportOnly || analysis.fullPageSuitability === "detail_only") roles.push(roles[0] || "detail", "context");
        else if (analysis.completeWorkScore >= 82) roles.push("complete_work_image", "primary_documentation", "overview");
        else if (analysis.primaryCandidate) roles.push("primary_documentation", "overview");
        else if (analysis.orientation === "panorama") roles.push("overview", "installation_view");
        else roles.push("weak_candidate", "overview");
        return [...new Set(roles)].slice(0, 4);
      };
      (async () => {
        const output = [];
        for (const imagePath of paths) {
          try {
            const metadata = await sharp(imagePath).metadata();
            const stats = await sharp(imagePath).stats();
            const width = metadata.width || 0;
            const height = metadata.height || 0;
            const dominant = stats.dominant || { r: 128, g: 128, b: 128 };
            const means = stats.channels.slice(0, 3).map((channel) => channel.mean || 0);
            const averageBrightness = means.length ? means.reduce((sum, value) => sum + value, 0) / (means.length * 255) : 0.5;
            const aspectRatio = width / Math.max(1, height);
            const orientation = orientationFor(width, height);
            const fileSizeBytes = fs.statSync(imagePath).size;
            const qualityRisks = [];
            const tooSmallForFullPage = Math.max(width, height) < 1800 || Math.min(width, height) < 1000;
            if (tooSmallForFullPage) qualityRisks.push("too small for full-page use");
            if (fileSizeBytes < 150 * 1024) qualityRisks.push("small source file");
            if (averageBrightness < 0.18) qualityRisks.push("very dark image may lose detail in print");
            if (averageBrightness > 0.92) qualityRisks.push("very bright image may wash out on off-white pages");
            if (aspectRatio > 3.2 || aspectRatio < 0.42) qualityRisks.push("extreme aspect ratio needs context or spread layout");
            if (/wechat|screenshot|screen/.test(imagePath.toLowerCase())) qualityRisks.push("may be a screenshot or phone transfer");
            const signals = supportSignalsFor(imagePath);
            if (signals.cropRisk) qualityRisks.push("crop/detail filename signal; support-only unless no complete artwork image exists");
            if (signals.partialImageRisk) qualityRisks.push("partial image risk");
            if (signals.temporaryPhotoRisk) qualityRisks.push("temporary/process/studio/screenshot risk");
            if (signals.installationRisk) qualityRisks.push("installation/context image risk");
            if (signals.archiveRisk) qualityRisks.push("archive/reference image risk");
            const analysis = {
              path: imagePath,
              width,
              height,
              aspectRatio,
              orientation,
              fileSizeBytes,
              format: metadata.format || "",
              dominantColors: ["#" + toHex(dominant.r) + toHex(dominant.g) + toHex(dominant.b)],
              palette: ["#" + toHex(dominant.r) + toHex(dominant.g) + toHex(dominant.b), "#" + means.map(toHex).join("")],
              averageBrightness,
              brightnessLabel: brightnessLabelFor(averageBrightness),
              tooSmallForFullPage,
              fullPageSuitability: "usable",
              qualityRisks,
              recommendedRoles: [],
              assignedRole: "weak_candidate",
              recommendedRole: "weak_candidate",
              completeWorkScore: 0,
              primaryCandidate: false,
              cropRisk: signals.cropRisk,
              partialImageRisk: signals.partialImageRisk,
              temporaryPhotoRisk: signals.temporaryPhotoRisk,
              supportOnly: false,
              rejectionReason: "",
              selectionReason: ""
            };
            analysis.completeWorkScore = completeWorkScoreFor(analysis);
            analysis.supportOnly = signals.cropRisk || signals.partialImageRisk || signals.temporaryPhotoRisk || signals.installationRisk || signals.archiveRisk || analysis.completeWorkScore < 45;
            analysis.primaryCandidate = !analysis.supportOnly && analysis.completeWorkScore >= 70 && !tooSmallForFullPage;
            analysis.fullPageSuitability = suitabilityFor(analysis);
            analysis.recommendedRoles = rolesFor(analysis);
            analysis.recommendedRole = analysis.recommendedRoles[0] || "weak_candidate";
            analysis.assignedRole = analysis.recommendedRole;
            if (analysis.primaryCandidate) analysis.selectionReason = "Complete artwork documentation candidate with sufficient resolution and no support-only filename/path signals.";
            else analysis.rejectionReason = analysis.supportOnly ? "Support-only image; not eligible as primary when a complete artwork image exists." : "Weak primary candidate due to image quality or composition risk.";
            output.push(analysis);
          } catch (error) {
            output.push({
              path: imagePath,
              width: 0,
              height: 0,
              aspectRatio: 0,
              orientation: "square",
              fileSizeBytes: 0,
              format: "",
              dominantColors: [],
              palette: [],
              averageBrightness: 0,
              brightnessLabel: "dark",
              tooSmallForFullPage: true,
              fullPageSuitability: "exclude",
              qualityRisks: ["sharp analysis failed: " + (error && error.message ? error.message : "unknown error")],
              recommendedRoles: ["excluded"],
              assignedRole: "excluded",
              recommendedRole: "excluded",
              completeWorkScore: 0,
              primaryCandidate: false,
              cropRisk: false,
              partialImageRisk: false,
              temporaryPhotoRisk: false,
              supportOnly: true,
              rejectionReason: "Image analysis failed; excluded from primary selection."
            });
          }
        }
        console.log(JSON.stringify(output));
      })().catch((error) => { console.error(error); process.exit(1); });
    `;
    const output = childProcess.execFileSync(process.execPath, ["-e", code], {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 60000,
      maxBuffer: 4 * 1024 * 1024
    });
    return JSON.parse(output) as PortfolioImageAnalysis[];
  } catch {
    return uniquePaths.map((imagePath) => fallbackImageAnalysis(imagePath));
  }
}

function fallbackImageAnalysis(imagePath: string): PortfolioImageAnalysis {
  const lower = path.basename(imagePath).toLowerCase();
  const fullLower = imagePath.toLowerCase();
  const supportOnly = supportOnlyPattern.test(lower);
  const recommendedRoles: PortfolioImageRole[] = supportOnly ? [fallbackSupportRole(lower), "context"] : ["primary_documentation", "overview"];
  return {
    path: imagePath,
    width: 0,
    height: 0,
    aspectRatio: 0,
    orientation: "square",
    fileSizeBytes: fs.existsSync(imagePath) ? fs.statSync(imagePath).size : 0,
    format: path.extname(imagePath).replace(/^\./, ""),
    dominantColors: [],
    palette: [],
    averageBrightness: 0.5,
    brightnessLabel: "balanced",
    tooSmallForFullPage: true,
    fullPageSuitability: "detail_only",
    qualityRisks: ["image analysis fallback used"],
    recommendedRoles,
    assignedRole: recommendedRoles[0],
    recommendedRole: recommendedRoles[0],
    completeWorkScore: supportOnly ? 20 : /artist-assets\/works|\/works\//.test(fullLower) ? 72 : 58,
    primaryCandidate: !supportOnly,
    cropRisk: /detail|closeup|close-up|crop|cropped/.test(lower),
    partialImageRisk: /detail|closeup|close-up|crop|cropped|partial/.test(lower),
    temporaryPhotoRisk: /process|studio|temp|temporary|screenshot|screen|packing|backup/.test(lower),
    supportOnly,
    rejectionReason: supportOnly ? "Support-only filename/path signal; not eligible as primary when complete artwork image exists." : undefined,
    selectionReason: supportOnly ? undefined : "Fallback primary candidate without support-only filename/path signals."
  };
}

function fallbackSupportRole(lower: string): PortfolioImageRole {
  if (/temp|temporary/.test(lower)) return "temporary";
  if (/crop|cropped/.test(lower)) return "cropped";
  if (/partial|detail|closeup|close-up/.test(lower)) return "partial";
  if (/install|installation/.test(lower)) return "installation_view";
  if (/process|studio|packing/.test(lower)) return "process";
  if (/archive|reference/.test(lower)) return "archive_reference";
  return "weak_candidate";
}
