import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = process.cwd();

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/server") {
    return nextResolve("next/server.js", context);
  }
  if (specifier.startsWith("@/")) {
    return resolveCandidate(path.join(root, "src", specifier.slice(2)));
  }
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    return resolveCandidate(path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier));
  }
  return nextResolve(specifier, context);
}

function resolveCandidate(candidate) {
  for (const filePath of [candidate, `${candidate}.ts`, `${candidate}.tsx`, `${candidate}.js`, path.join(candidate, "index.ts")]) {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return { url: pathToFileURL(filePath).href, shortCircuit: true };
    }
  }
  return { url: pathToFileURL(candidate).href, shortCircuit: true };
}
