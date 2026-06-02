import childProcess from "node:child_process";
import { test } from "node:test";

test("writeApplicationPackage produces automated portfolio artifacts from real inputs", {
  skip: process.features?.typescript ? false : "requires Node TypeScript strip-types support"
}, () => {
  childProcess.execFileSync(process.execPath, [
    "--experimental-strip-types",
    "--loader",
    "./tests/ts-esm-loader.mjs",
    "./tests/package-behavior-runner.mjs"
  ], {
    cwd: process.cwd(),
    stdio: "pipe",
    timeout: 180000
  });
});
