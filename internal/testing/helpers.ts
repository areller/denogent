import { stdFs, stdPath } from "../../deps.ts";
import type { Logger } from "../../lib/core/logger.ts";

export async function copyDirToTemp(path: string, fn: (tempPath: string) => Promise<void>): Promise<void> {
  const dir = await Deno.makeTempDir();

  await stdFs.copy(path, dir, {
    overwrite: true,
  });

  try {
    if (await stdFs.exists(stdPath.join(dir, "._git"))) {
      await stdFs.move(stdPath.join(dir, "._git"), stdPath.join(dir, ".git"));
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
    debug: log => (onLog !== undefined ? onLog(log) : {}),
    info: _ => {},
    warn: _ => {},
    error: (_: string | Error) => {},
  };
}
