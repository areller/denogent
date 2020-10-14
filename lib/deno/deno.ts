import { stdPath } from "../../deps.ts";
import { runCommand } from "../../internal/helpers/cmd.ts";
import { DenoPermissions, DenoTestArgs } from "./args.ts";

class DenoTools {
  private _permFlagMap: { [perm: number]: string } = {
    [DenoPermissions.All]: "--allow-all",
    [DenoPermissions.Env]: "--allow-env",
    [DenoPermissions.HRTime]: "--allow-hrtime",
    [DenoPermissions.Net]: "--allow-net",
    [DenoPermissions.Plugin]: "--allow-plugin",
    [DenoPermissions.Read]: "--allow-read",
    [DenoPermissions.Write]: "--allow-write",
  };

  constructor() {}

  public async test(args: DenoTestArgs): Promise<boolean> {
    let cmd = ["deno", "test"];
    this.insertPermissions(cmd, args.permissions);
    if (args.flags !== undefined) {
      cmd.push(...args.flags);
    }

    if (args.filter !== undefined) {
      cmd.push("--filter", `${args.filter}`);
    }

    const path = this.getCwd(args.path);

    const [status, _] = await runCommand(
      cmd,
      (line) => {
        if (args.logger) {
          args.logger.debug(line.trim());
        }
      },
      path,
      false,
    );
    if (!status && (args.throwOnFailure ?? true)) {
      throw new Error("tests have failed");
    }

    return status;
  }

  private insertPermissions(cmd: string[], permissions: DenoPermissions) {
    if (permissions == DenoPermissions.All) {
      cmd.push(this._permFlagMap[DenoPermissions.All]);
    } else {
      for (const perm of [
        DenoPermissions.Env,
        DenoPermissions.HRTime,
        DenoPermissions.Net,
        DenoPermissions.Plugin,
        DenoPermissions.Read,
        DenoPermissions.Write,
      ]) {
        if ((permissions & perm) == perm) {
          cmd.push(this._permFlagMap[perm]);
        }
      }
    }
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

const deno = new DenoTools();
export default deno;
