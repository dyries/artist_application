import fs from "node:fs";
import path from "node:path";
import childProcess from "node:child_process";

const pythonEnvVars = ["ARTIST_STUDIO_PYTHON", "CODEX_PYTHON", "PYTHON"];

export function resolvePythonPath() {
  for (const key of pythonEnvVars) {
    const value = process.env[key];
    if (value && fs.existsSync(value)) return value;
  }

  const home = process.env.HOME;
  const candidates = [
    home ? path.join(home, ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "python", "bin", "python3") : ""
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  try {
    const systemPython = childProcess.execFileSync("python3", ["-c", "import sys; print(sys.executable)"], {
      encoding: "utf8",
      timeout: 5000
    }).trim();
    if (systemPython && fs.existsSync(systemPython)) return systemPython;
  } catch {
    // Python is optional until a PDF text scan is required.
  }

  return null;
}
