import { copy, exists, move } from "https://deno.land/std/fs/mod.ts";
import { join } from "https://deno.land/std/path/mod.ts";

export async function copyDirToTemp(path: string, fn: (tempPath: string) => Promise<void>): Promise<void> {
    const dir = await Deno.makeTempDir();
    
    await copy(path, dir, {
        overwrite: true
    });

    try {
        if (await exists(join(dir, '._git'))) {
            await move(join(dir, '._git'), join(dir, '.git'));
        }

        await fn(dir);
    }
    finally {
        await Deno.remove(dir, {
            recursive: true
        });
    }
}

export async function emptyTempDir(fn: (tempPath: string) => Promise<void>): Promise<void> {
    const dir = await Deno.makeTempDir();

    try {
        await fn(dir);
    }
    finally {
        await Deno.remove(dir, {
            recursive: true
        });
    }
}