import { stdPath } from "../deps.ts";
import { getCurrentImportPath } from "../src/internal/helpers/env.ts";
import { copyDirToTemp } from "../src/internal/testing/helpers.ts";

const assetsPath = stdPath.join(getCurrentImportPath(import.meta.url), "testassets");

export async function createBuildInTempDir(fn: (tempPath: string) => Promise<void>): Promise<void> {
  await copyDirToTemp(assetsPath, fn);
}

export function isJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch (_) {
    return false;
  }
}
