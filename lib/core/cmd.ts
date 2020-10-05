import { readLines } from "../../internal/helpers/reading.ts";
import { runCommand as runCommandInternal } from "../../internal/helpers/cmd.ts";
import type { Logger } from "./logger.ts";

export interface RunCommandArgs {
    /**
     * The absolute or relative path to the working directory.
     * If undefined, defaults to the current working directory.
     */
    path?: string;
    /**
     * The command to run.
     */
    cmd: string[];
    /**
     * The interface that will be used for logging.
     */
    logger: Logger | undefined | false;
    /**
     * Determines whether an exception should be thrown upon failure. (Default: true)
     */
    throwOnFailure?: boolean;
}

/**
 * Runs a command and returns success/failure and output.
 * @param args run arguments
 */
export async function runCommand(args: RunCommandArgs): Promise<[boolean, string]> {
    const res = await runCommandInternal(args.cmd, line => {
        if (args.logger) {
            args.logger.debug(line);
        }
    }, args.path, args.throwOnFailure ?? true) as [boolean, string];

    return res;
}