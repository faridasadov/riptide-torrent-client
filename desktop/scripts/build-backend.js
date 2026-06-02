const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const platformArg = process.argv[2] || "auto";
const platform = platformArg === "auto" ? process.platform : platformArg;
const repoRoot = path.resolve(__dirname, "..", "..");
const backendDir = path.join(repoRoot, "backend");
const specPath = path.join(backendDir, "riptide-backend.spec");
const workPath = path.join(backendDir, "build", platform);
const distPath = path.join(backendDir, "dist", platform);
const env = { ...process.env, RIPTIDE_BUILD_PLATFORM: platform };

fs.mkdirSync(workPath, { recursive: true });
fs.mkdirSync(distPath, { recursive: true });

const args = [
  specPath,
  "--distpath", distPath,
  "--workpath", workPath,
  "--noconfirm",
  "--clean",
];

const result = spawnSync("pyinstaller", args, {
  cwd: backendDir,
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}
