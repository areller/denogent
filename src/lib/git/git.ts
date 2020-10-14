import { stdPath } from "../../../deps.ts";
import { runCommand } from "../../internal/helpers/cmd.ts";
import type { GitCommandArgs, GitSubCommandArgs } from "./args.ts";

class Git {
  private _detectGitTask: Promise<void>;

  constructor() {
    this._detectGitTask = new Promise((resolve, reject) => {
      let process = Deno.run({
        cmd: ["git", "--version"],
        stdout: "null",
        stderr: "null",
      });

      process.status().then(async (status) => {
        if (!status.success) {
          reject(`Git wasn't detected.`);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Returns whether a directory contains a git repository or not.
   * @param args command arguments
   */
  public async isGitRepository(args: GitCommandArgs): Promise<boolean> {
    let [success, _] = await this.runGit(args, ["status"], false);
    return success;
  }

  /**
   * Returns whether the HEAD of the repository is tagged or not.
   * @param args command arguments
   */
  public async isTagged(args: GitCommandArgs): Promise<boolean> {
    let [success, _] = await this.runGit(args, ["describe", "--exact-match", "--tags", "HEAD"], false);
    return success;
  }

  /**
   * Returns the HEAD commit.
   * @param args command arguments
   */
  public async getHeadCommit(args: GitCommandArgs): Promise<string> {
    let [_, output] = await this.runGit(args, ["rev-parse", "HEAD"]);
    return output.trim();
  }

  /**
   * Returns the name of the current branch.
   * @param args command arguments
   */
  public async getBranch(args: GitCommandArgs): Promise<string> {
    let [_, output] = await this.runGit(args, ["rev-parse", "--abbrev-ref", "HEAD"]);
    return output.trim();
  }

  /**
   * If the current commit is tagged, returns the name of the tag. Otherwise, returns `{closest tag}-{distance from that tag}`, or undefined if there is not tag in current tree.
   * @param args command arguments
   */
  public async describe(args: GitCommandArgs): Promise<string | undefined> {
    let [success, output] = await this.runGit(args, ["describe", "--tags"], false);
    if (!success) {
      return undefined;
    }

    return output.trim();
  }

  /**
   * Runs a git sub command.
   * @param args sub command arguments
   */
  public async subcmd(args: GitSubCommandArgs): Promise<string> {
    let [_, output] = await this.runGit(args, args.cmd instanceof Array ? args.cmd : args.cmd.split(" "), true);
    return output.trim();
  }

  private async runGit(args: GitCommandArgs, cmd: string[], throwOnFailure?: boolean): Promise<[boolean, string]> {
    await this.detectGit();
    const path = this.getCwd(args?.path);

    const [status, output] = await runCommand(["git", ...cmd], undefined, path, false);
    if (!status && (throwOnFailure ?? true)) {
      throw new Error(`Unsuccessful response for 'git ${cmd.join(" ")}'.`);
    }

    return [status, output];
  }

  private async detectGit(): Promise<void> {
    await this._detectGitTask;
  }

  private getCwd(cwd?: string): string {
    if (cwd === undefined) {
      return Deno.cwd();
    }

    if (stdPath.isAbsolute(cwd)) {
      return cwd;
    }

    return stdPath.join(Deno.cwd(), cwd);
  }
}

const git = new Git();
export default git;
