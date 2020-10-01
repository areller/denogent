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
        await this.detectGit();
        const path = this.getCwd(args?.path);

        const process = Deno.run({ cmd: ['git', 'status'], cwd: path, stdout: 'null', stderr: 'null' });
        const status = await process.status();

        return status.success;
    }

    /**
     * Returns whether the HEAD of the repository is tagged or not.
     * @param args command arguments
     */
    async isTagged(args: GitCommandArgs): Promise<boolean> {
        await this.detectGit();
        return false;
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