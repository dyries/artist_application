import fs from "node:fs";
import path from "node:path";
import childProcess from "node:child_process";
import type { PortfolioImageAnalysis, PortfolioImageRole } from "@/types/domain";

export function analyzePortfolioImages(imagePaths: string[]): PortfolioImageAnalysis[] {
  const uniquePaths = [...new Set(imagePaths)].filter((imagePath) => imagePath && fs.existsSync(imagePath));
  if (!uniquePaths.length) return [];
  try {
    const code = `
      const fs = require("node:fs");
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
      const suitabilityFor = (analysis) => {
        if (!analysis.width || !analysis.height) return "exclude";
        if (analysis.tooSmallForFullPage || analysis.fileSizeBytes < 120 * 1024) return "detail_only";
        if (analysis.orientation === "panorama") return "usable";
        if (Math.max(analysis.width, analysis.height) >= 2400 && Math.min(analysis.width, analysis.height) >= 1400 && analysis.averageBrightness >= 0.22 && analysis.averageBrightness <= 0.88) return "strong";
        return "usable";
      };
      const rolesFor = (analysis) => {
        const lower = analysis.path.toLowerCase();
        const roles = [];
        if (/install|view|space|documentation/.test(lower)) roles.push("installation_view");
        if (/detail|close|crop/.test(lower)) roles.push("detail");
        if (/process|studio|material/.test(lower)) roles.push("process");
        if (/archive|reference|research/.test(lower)) roles.push("archive_reference");
        if (analysis.fullPageSuitability === "exclude") roles.push("excluded");
        else if (analysis.fullPageSuitability === "detail_only") roles.push("detail", "context");
        else if (analysis.orientation === "panorama") roles.push("overview", "installation_view");
        else roles.push("primary", "overview");
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
              recommendedRoles: []
            };
            analysis.fullPageSuitability = suitabilityFor(analysis);
            analysis.recommendedRoles = rolesFor(analysis);
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
              recommendedRoles: ["excluded"]
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
  const lower = imagePath.toLowerCase();
  const recommendedRoles: PortfolioImageRole[] = /detail|process|reference|archive/.test(lower) ? ["detail", "context"] : ["primary", "overview"];
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
    recommendedRoles
  };
}
