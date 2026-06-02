import childProcess from "node:child_process";
import { test } from "node:test";

test("portfolio planning constraints respect default, exact page, and image-upload-only cases", () => {
  childProcess.execFileSync(process.execPath, [
    "--experimental-strip-types",
    "--loader",
    "./tests/ts-esm-loader.mjs",
    "./tests/portfolio-planning-runner.mjs"
  ], {
    cwd: process.cwd(),
    stdio: "pipe",
    timeout: 30000
  });
});
