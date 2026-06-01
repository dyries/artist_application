import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));
const readText = (filePath) => fs.readFileSync(filePath, "utf8");

test("LICENSE names Dyre as the rights holder", () => {
  const license = readText("LICENSE");

  assert.match(license, /Copyright \(c\) 2026 Dyre\. All rights reserved\./);
  assert.doesNotMatch(license, /Copyright \(c\) 2026 Chenyu/);
});

test("npm scripts separate tests from structure verification", () => {
  const packageJson = readJson("package.json");

  assert.equal(packageJson.scripts.test, "node --test tests/*.test.mjs");
  assert.equal(packageJson.scripts["test:structure"], "node scripts/verify-project.mjs");
  assert.match(packageJson.scripts.check, /npm run test:structure/);
  assert.match(packageJson.scripts.check, /npm run build/);
});

test("CI runs tests, structure verification, and build", () => {
  const workflow = readText(".github/workflows/checks.yml");

  assert.match(workflow, /run: npm test/);
  assert.match(workflow, /run: npm run test:structure/);
  assert.match(workflow, /run: npm run build/);
});

test("private materials and generated outputs stay ignored", () => {
  const gitignore = readText(".gitignore");

  for (const snippet of [
    "data/*.sqlite",
    "artist-assets/inbox/**",
    "artist-assets/source-materials/**",
    "artist-assets/works/**",
    "generated/**",
    "backups/"
  ]) {
    assert.ok(gitignore.includes(snippet), `.gitignore is missing ${snippet}`);
  }
});
