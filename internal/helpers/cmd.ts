import { readLines } from "./reading.ts";

/**
 * Runs a command and returns success/failure and output.
 * @param cmd the command to run
 * @param onLine a function that gets called whenever a new line is output
 * @param path the absolute or relative path to the working directory
 * @param throwOnFailure determines whether an exceptions should be thrown upon failure. (Default: true)
 */
export async function runCommand(cmd: string[], onLine?: (line: string) => void, path?: string, throwOnFailure?: boolean) {
    const process = Deno.run({
        cmd: cmd,
        cwd: path ?? Deno.cwd(),
        stdout: 'piped',
        stderr: 'piped'
    });

    await readLines([process.stdout, process.stderr], false, line => {
        if (onLine) {
            onLine(line);
        }
    });

    const status = await process.status();
    const output = await process.output();
    await process.stderrOutput();

    if (!status.success && (throwOnFailure ?? true)) {
        throw new Error(`Command '${cmd.join(' ')}' has failed.`);
    }

    return [status.success, new TextDecoder().decode(output)];
}