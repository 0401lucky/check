import fs from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const standaloneRoot = path.join(projectRoot, ".next", "standalone");

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function copyDirectory(sourceDir, targetDir) {
  await fs.mkdir(path.dirname(targetDir), { recursive: true });
  await fs.cp(sourceDir, targetDir, {
    recursive: true,
    force: true,
    dereference: true,
  });
}

async function resolveSourceDir() {
  const candidates = [
    path.join(
      projectRoot,
      "node_modules",
      ".pnpm",
      "node_modules",
      "@prisma",
      "client-runtime-utils"
    ),
  ];

  const pnpmStoreDir = path.join(projectRoot, "node_modules", ".pnpm");
  if (await exists(pnpmStoreDir)) {
    const entries = await fs.readdir(pnpmStoreDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (!entry.name.startsWith("@prisma+client-runtime-utils@")) continue;

      candidates.push(
        path.join(
          pnpmStoreDir,
          entry.name,
          "node_modules",
          "@prisma",
          "client-runtime-utils"
        )
      );
    }
  }

  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return candidate;
    }
  }

  throw new Error("未找到 @prisma/client-runtime-utils 源目录");
}

async function main() {
  if (!(await exists(standaloneRoot))) {
    console.warn("[构建补丁] 未检测到 .next/standalone，跳过 Prisma 运行时补丁");
    return;
  }

  const sourceDir = await resolveSourceDir();
  const destinations = [
    path.join(
      standaloneRoot,
      "node_modules",
      "@prisma",
      "client-runtime-utils"
    ),
    path.join(
      standaloneRoot,
      "node_modules",
      ".pnpm",
      "node_modules",
      "@prisma",
      "client-runtime-utils"
    ),
  ];

  for (const destination of destinations) {
    await copyDirectory(sourceDir, destination);
  }

  console.log("[构建补丁] 已补齐 standalone 所需的 Prisma runtime utils");
}

await main();
