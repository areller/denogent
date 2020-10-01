import type { Logger } from "../core/logger.ts";

/**
 * Deno runtime permissions.
 */
export enum DenoPermissions {
    None = 0,
    Env = 1 << 0,
    HRTime = 1 << 1,
    Net = 1 << 2,
    Plugin = 1 << 3,
    Read = 1 << 4,
    Write = 1 << 5,
    All = Env | HRTime | Net | Plugin | Read | Write
}

/**
 * Common arguments for all deno commands
 */
export interface DenoCommandArgs {
    /**
     * The absolute or relative path to the project directory. 
     * If undefined, defaults to working directory.
     */
    path?: string;

    /**
     * The interface that will be used for logging
     */
    logger: Logger | undefined | false;

    /**
     * The permissions for deno test.
     */
    permissions: DenoPermissions;

    /**
     * Additional flags for deno
     */
    flags?: string[];
}

/**
 * Arguments for the deno test command
 */
export interface DenoTestArgs extends DenoCommandArgs {
    /**
     * Run tests with this string or pattern in the test name.
     */
    filter?: string;

    /**
     * Determines whether an exception should be thrown upon a failed test. (Default: true)
     */
    throwOnFailure?: boolean;
}