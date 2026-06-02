import childProcess from "node:child_process";
import { test } from "node:test";

test("local-first fixture covers auth, db selection, readiness, and approval archive", {
  skip: process.features?.typescript ? false : "requires Node TypeScript strip-types support"
}, () => {
  childProcess.execFileSync(process.execPath, [
    "--experimental-strip-types",
    "--loader",
    "./tests/ts-esm-loader.mjs",
    "./tests/local-workspace-fixture-runner.mjs"
  ], {
    cwd: process.cwd(),
    stdio: "pipe",
    timeout: 240000
  });
});
