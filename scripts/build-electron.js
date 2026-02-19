/**
 * Electron ビルドスクリプト
 *
 * 1. Next.js standalone ビルド
 * 2. dist-app/ にElectronアプリ構造を組み立て
 * 3. electron-builder はこの dist-app/ をパッケージング
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DIST_APP = path.join(ROOT, "dist-app");

function run(cmd, label) {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`📦 ${label}`);
  console.log(`${"=".repeat(50)}`);
  console.log(`> ${cmd}\n`);
  execSync(cmd, { cwd: ROOT, stdio: "inherit" });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`⚠️  Skip (not found): ${src}`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function rmDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ── Step 1: Clean ──
console.log("🧹 Cleaning dist-app...");
rmDir(DIST_APP);
fs.mkdirSync(DIST_APP, { recursive: true });

// ── Step 2: Prisma generate ──
run("npx prisma generate", "Prisma Client 生成");

// ── Step 3: Next.js ビルド ──
run("npx next build", "Next.js プロダクションビルド");

// ── Step 4: dist-app にアプリ構造を組み立て ──
console.log("\n📁 アプリ構造を構築中...");

// 4a: standalone (Next.jsサーバー) → dist-app/.next/standalone/
const standaloneSrc = path.join(ROOT, ".next", "standalone");
const standaloneDest = path.join(DIST_APP, ".next", "standalone");
console.log("  → standalone...");
copyDir(standaloneSrc, standaloneDest);

// 4b: static → dist-app/.next/standalone/.next/static/
const staticSrc = path.join(ROOT, ".next", "static");
const staticDest = path.join(DIST_APP, ".next", "standalone", ".next", "static");
console.log("  → static...");
copyDir(staticSrc, staticDest);

// 4c: public → dist-app/.next/standalone/public/
const publicSrc = path.join(ROOT, "public");
const publicDest = path.join(DIST_APP, ".next", "standalone", "public");
if (fs.existsSync(publicSrc)) {
  console.log("  → public...");
  copyDir(publicSrc, publicDest);
}

// 4d: Prisma (.prisma/client) → standalone/node_modules/.prisma/
const prismaSrc = path.join(ROOT, "node_modules", ".prisma");
const prismaDest = path.join(standaloneDest, "node_modules", ".prisma");
if (fs.existsSync(prismaSrc)) {
  console.log("  → .prisma/client...");
  copyDir(prismaSrc, prismaDest);
}

// 4e: @prisma/client → standalone/node_modules/@prisma/client/
const prismaClientSrc = path.join(ROOT, "node_modules", "@prisma", "client");
const prismaClientDest = path.join(standaloneDest, "node_modules", "@prisma", "client");
if (fs.existsSync(prismaClientSrc)) {
  console.log("  → @prisma/client...");
  copyDir(prismaClientSrc, prismaClientDest);
}

// 4f: DB ファイル
const dbSrc = path.join(ROOT, "prisma", "dev.db");
const dbDest = path.join(DIST_APP, "prisma", "dev.db");
if (fs.existsSync(dbSrc)) {
  console.log("  → dev.db...");
  fs.mkdirSync(path.dirname(dbDest), { recursive: true });
  fs.copyFileSync(dbSrc, dbDest);
}

// 4g: Electron ファイル
console.log("  → electron/...");
copyDir(path.join(ROOT, "electron"), path.join(DIST_APP, "electron"));

// 4h: package.json (mainフィールド付き)
console.log("  → package.json...");
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const electronPkg = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  author: pkg.author,
  main: "electron/main.js",
  private: true,
};
fs.writeFileSync(
  path.join(DIST_APP, "package.json"),
  JSON.stringify(electronPkg, null, 2)
);

console.log("\n" + "=".repeat(50));
console.log("✅ dist-app/ の構築完了！");
console.log("=".repeat(50));

// ── ファイル確認 ──
const serverJs = path.join(standaloneDest, "server.js");
const nodeModules = path.join(standaloneDest, "node_modules");
console.log(`\n📋 チェック:`);
console.log(`  server.js: ${fs.existsSync(serverJs) ? "✅" : "❌"}`);
console.log(`  node_modules: ${fs.existsSync(nodeModules) ? "✅" : "❌"}`);
console.log(`  .next/static: ${fs.existsSync(staticDest) ? "✅" : "❌"}`);
console.log(`  .prisma: ${fs.existsSync(prismaDest) ? "✅" : "❌"}`);
console.log(`  dev.db: ${fs.existsSync(dbDest) ? "✅" : "❌"}`);
console.log(`  electron/main.js: ${fs.existsSync(path.join(DIST_APP, "electron", "main.js")) ? "✅" : "❌"}`);
console.log("");
