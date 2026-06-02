import childProcess from "node:child_process";
import { test } from "node:test";

test("portfolio output quality counts single_work_full_page image paths", () => {
  childProcess.execFileSync(process.execPath, [
    "--experimental-strip-types",
    "--loader",
    "./tests/ts-esm-loader.mjs",
    "./tests/portfolio-quality-runner.mjs"
  ], {
    cwd: process.cwd(),
    stdio: "pipe",
    timeout: 30000
  });
});
