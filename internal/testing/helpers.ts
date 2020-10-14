import { stdFs, stdPath } from "../../deps.ts";
import type { Logger } from "../../lib/core/logger.ts";
import { delay } from "../../tests_deps.ts";
import { isWindows } from "../helpers/env.ts";

export async function copyDirToTemp(
  path: string,
  fn: (tempPath: string) => Promise<void>,
  subTempDir?: string,
): Promise<void> {
  const dir = await Deno.makeTempDir();
  const targetDir = subTempDir === undefined ? dir : stdPath.join(dir, subTempDir);

  await stdFs.ensureDir(targetDir);

  await stdFs.copy(path, targetDir, {
    overwrite: true,
  });

  try {
    if (await stdFs.exists(stdPath.join(targetDir, "._git"))) {
      await stdFs.move(stdPath.join(targetDir, "._git"), stdPath.join(targetDir, ".git"));
    }

    await fn(dir);
  } finally {
    //await tryRemoveDir(dir);
  }
}

export async function emptyTempDir(fn: (tempPath: string) => Promise<void>): Promise<void> {
  const dir = await Deno.makeTempDir();

  try {
    await fn(dir);
  } finally {
    await tryRemoveDir(dir);
  }
}

export function mockDebugLogger(onLog?: (log: string) => void): Logger {
  return {
    debug: (log) => (onLog !== undefined ? onLog(log) : {}),
    info: (_) => {},
    warn: (_) => {},
    error: (_: string | Error) => {},
  };
}

async function tryRemoveDir(path: string): Promise<void> {
  const retries = 10;
  for (let i = 0; i < retries; i++) {
    try {
      if (isWindows()) {
        // windows has weird permission problems
        await removeRecursive(path);
      }
      else {
        await Deno.remove(path, {
          recursive: true
        });
      }
      return;
    }
    catch (err) {
      if (i == retries - 1) {
        throw err;
      }
      else {
        await delay(1000);
      }
    }
  }
}

async function removeRecursive(path: string): Promise<void> {
  for await (const entry of stdFs.walk(path, { maxDepth: 1 })) {
    if (entry.isDirectory && stdPath.normalize(path) == stdPath.normalize(entry.path)) {
      continue;
    }

    if (entry.isDirectory) {
      await removeRecursive(entry.path);
    }
    else {
      await Deno.remove(entry.path);
    }
  }

  await Deno.remove(path);
}