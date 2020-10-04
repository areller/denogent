import * as path from "https://deno.land/std/path/mod.ts";
import type { GitCommandArgs } from "./args.ts";

class Git {

    private _detectGitTask: Promise<void>;

    constructor() {
        this._detectGitTask =  new Promise((resolve, reject) => {
            let process = Deno.run({
                cmd: ['git', '--version'],
                stdout: 'null',
                stderr: 'null'
            });

            process
                .status()
                .then(async status => {
                    if (!status.success) {
                        reject(`Git wasn't detected.`);
                    }
                    else {
                        resolve();
                    }
                });
        });
    }

    /**
     * Returns whether a directory contains a git repository or not.
     * @param args command arguments
     */
    async isGitRepository(args: GitCommandArgs): Promise<boolean> {
        let [success, _] = await this.runGit(args, ['status']);
        return success;
    }

    /**
     * Returns whether the HEAD of the repository is tagged or not.
     * @param args command arguments
     */
    async isTagged(args: GitCommandArgs): Promise<boolean> {
        await this.detectGit();
        return false;
    }

    /**
     * Returns the HEAD commit.
     * @param args command arguments
     */
    async getHeadCommit(args: GitCommandArgs): Promise<string> {
        let [success, output] = await this.runGit(args, ['rev-parse', 'HEAD']);
        if (!success) {
            this.throwOnUnsuccessful(['rev-parse', 'HEAD']);
        }

        return output.trim();
    }

    /**
     * Returns the name of the current branch.
     * @param args command arguments
     */
    async getBranch(args: GitCommandArgs): Promise<string> {
        let [success, output] = await this.runGit(args, ['rev-parse', '--abbrev-ref', 'HEAD']);
        if (!success) {
            this.throwOnUnsuccessful(['rev-parse', '--abbrev-ref', 'HEAD']);
        }

        return output.trim();
    }

    /**
     * If the current commit is tagged, returns the name of the tag. Otherwise, returns `{closest tag}-{distance from that tag}`, or undefined if there is not tag in current tree.
     * @param args command arguments
     */
    async describe(args: GitCommandArgs): Promise<string | undefined> {
        let [success, output] = await this.runGit(args, ['describe', '--tags']);
        if (!success) {
            return undefined;
        }

        return output.trim();
    }

    private async throwOnUnsuccessful(cmd: string[]) {
        throw new Error(`Unsuccessful response for 'git ${cmd.join(' ')}'.`);
    }

    private async runGit(args: GitCommandArgs, cmd: string[]): Promise<[boolean, string]> {
        await this.detectGit();
        const path = this.getCwd(args?.path);

        const process = Deno.run({ cmd: ['git', ...cmd], cwd: path, stdout: 'piped' });
        const status = await process.status();

        if (!status.success) {
            return [false, ''];
        }

        return [true, new TextDecoder().decode(await process.output())];
    }

    private async detectGit(): Promise<void> {
        await this._detectGitTask;
    }

    private getCwd(cwd?: string): string {
        if (cwd === undefined) {
            return Deno.cwd();
        }

        if (path.isAbsolute(cwd)) {
            return cwd;
        }

        return path.join(Deno.cwd(), cwd);
    }
}

const git = new Git();
export default git;