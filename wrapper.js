// OpenClaw Universal Wrapper
// 自动检测 npm 全局安装的 openclaw，无需硬编码路径
// 适用于任何 Windows 用户的 Cherry Studio 环境
//
// 前提条件：
// 1. 已安装 Node.js（并在 PATH 中）
// 2. 已运行: npm install -g openclaw@latest
// 3. 用 bun build --compile 编译成 exe

import { execSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { platform } from "node:os";

// ========== 路径检测 ==========

function resolveOpenClawEntry() {
  const candidates = [];

  // 方式1: npm root -g（最可靠）
  try {
    const npmRoot = execSync("npm root -g", { encoding: "utf-8", timeout: 10000, stdio: ["pipe","pipe","pipe"] }).trim();
    if (npmRoot) candidates.push(join(npmRoot, "openclaw", "dist", "index.js"));
  } catch {}

  // 方式2: pnpm global root
  try {
    const pnpmRoot = execSync("pnpm root -g", { encoding: "utf-8", timeout: 10000, stdio: ["pipe","pipe","pipe"] }).trim();
    if (pnpmRoot) candidates.push(join(pnpmRoot, "openclaw", "dist", "index.js"));
  } catch {}

  // 方式3: 常见路径猜测
  const appData = process.env.APPDATA;
  if (appData) {
    candidates.push(join(appData, "npm", "node_modules", "openclaw", "dist", "index.js"));
  }

  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    candidates.push(join(localAppData, "fnm_multishells", process.version.slice(1), "node_modules", "openclaw", "dist", "index.js"));
    candidates.push(join(localAppData, "Volta", "tools", "shared", "openclaw", "dist", "index.js"));
  }

  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  candidates.push(join(programFiles, "nodejs", "node_modules", "npm", "node_modules", "openclaw", "dist", "index.js"));

  // 方式4: 通过 where 找到 openclaw 命令的位置反推
  try {
    const whereOutput = execSync(
      platform() === "win32" ? "where openclaw 2>nul" : "which openclaw 2>/dev/null",
      { encoding: "utf-8", timeout: 5000 }
    ).trim();
    if (whereOutput) {
      const cmdPath = whereOutput.split("\n")[0].trim();
      const cmdDir = dirname(cmdPath);
      candidates.push(join(cmdDir, "node_modules", "openclaw", "dist", "index.js"));
      candidates.push(join(cmdDir, "..", "node_modules", "openclaw", "dist", "index.js"));
    }
  } catch {}

  // 去重并检查存在性
  const seen = new Set();
  for (const candidate of candidates) {
    const normalized = candidate.replace(/\\/g, "/").toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      if (existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

// ========== 主逻辑 ==========

const entry = resolveOpenClawEntry();

if (!entry) {
  console.error("");
  console.error("========================================");
  console.error("  OpenClaw 未找到！");
  console.error("========================================");
  console.error("");
  console.error("  请先安装 OpenClaw：");
  console.error("    npm install -g openclaw@latest");
  console.error("");
  process.exit(1);
}

const child = spawn("node", [entry, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 0));
child.on("error", (err) => {
  console.error("OpenClaw 启动失败:", err.message);
  process.exit(1);
});
