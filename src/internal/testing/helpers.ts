import { stdFs, stdPath } from "../../../deps.ts";
import type { Logger } from "../../lib/core/logger.ts";

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
    await Deno.remove(dir, {
      recursive: true,
    });
  }
}

export async function emptyTempDir(fn: (tempPath: string) => Promise<void>): Promise<void> {
  const dir = await Deno.makeTempDir();

  try {
    await fn(dir);
  } finally {
    await Deno.remove(dir, {
      recursive: true,
    });
  }
}

export function mockDebugLogger(onLog?: (log: string) => void): Logger {
  return {
    debug: (log) => (onLog !== undefined ? onLog(log) : {}),
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    info: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    warn: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    error: () => {},
  };
}
