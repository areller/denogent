import { stdFs, stdPath } from "../deps.ts";
import { copyDirToTemp } from "../src/internal/testing/helpers.ts";

const assetsPath = stdPath.join(stdPath.dirname(import.meta.url), "testassets").substr("file:".length);

export async function createBuildInTempDir(fn: (tempPath: string) => Promise<void>) {
  await copyDirToTemp(
    ".",
    async (temp) => {
      const targetDir = stdPath.join(temp, "testassets");
      await stdFs.ensureDir(targetDir);
      await stdFs.copy(assetsPath, targetDir, { overwrite: true });
      await stdFs.move(stdPath.join(targetDir, "build._ts"), stdPath.join(targetDir, "build.ts"));
      await fn(targetDir);
    },
    "denogent",
  );
}

export function isJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch (_) {
    return false;
  }
}
