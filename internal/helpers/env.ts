import { osPlatform, stdPath } from "../../deps.ts";

export type Platform = 'win' | 'unix';

export function isWindows(): boolean {
    return osPlatform() == 'win32';
}

export function isUnix(): boolean {
    return osPlatform() != 'win32';
}

export function getCurrentImportPath(metaUrl: string): string {
    const filePath = isWindows() ? metaUrl.substr("file:///".length) : metaUrl.substr("file:".length);
    return stdPath.dirname(filePath);
}

export function pathJoin(paths: string[], platform: Platform): string {
    switch (platform) {
        case 'unix':
            return stdPath.posix.join(...paths);
        case 'win':
            return stdPath.win32.join(...paths);
    }
}