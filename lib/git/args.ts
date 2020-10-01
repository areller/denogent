import type { Logger } from "../core/logger.ts";

/**
 * Common arguments for all git commands
 */
export interface GitCommandArgs {
    /**
     * The absolute or relative path to the repository. 
     * If undefined, defaults to working directory.
     */
    path?: string;

    /**
     * The interface that will be used for logging
     */
    logger: Logger | undefined | false;
}