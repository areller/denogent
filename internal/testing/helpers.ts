import { copy } from "https://deno.land/std/fs/mod.ts";

export async function copyDirToTemp(path: string, fn: (tempPath: string) => Promise<void>): Promise<void> {
    const dir = await Deno.makeTempDir();
    
    await copy(path, dir, {
        overwrite: true
    });

    try {
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
        /*await Deno.remove(dir, {
            recursive: true
        });*/
    }
}