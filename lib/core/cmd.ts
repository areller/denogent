import { readLines } from "../../internal/helpers/reading.ts";
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
    const process = Deno.run({
        cmd: args.cmd,
        cwd: args.path ?? Deno.cwd(),
        stdout: 'piped',
        stderr: 'piped'
    });

    await readLines([process.stdout, process.stderr], false, line => {
        if (args.logger) {
            args.logger.debug(line);
        }
    });

    const status = await process.status();
    const output = await process.output();
    await process.stderrOutput();

    if (!status.success && (args.throwOnFailure ?? true)) {
        throw new Error(`Command '${args.cmd.join(' ')}' has failed.`);
    }

    return [status.success, new TextDecoder().decode(output)];
}