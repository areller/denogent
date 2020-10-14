import { runCommand as runCommandInternal } from "../../internal/helpers/cmd.ts";
import type { CommandArgs } from "./args.ts";
import type { Extension } from "../core/extension.ts";
import { Args, dotenv, parseArgs } from "../../../deps.ts";

class Runtime {
  private _args: Args;

  constructor() {
    dotenv();
    this._args = parseArgs(Deno.args);
  }

  /**
   * Runs a command and returns status and output.
   * @param args command arguments
   */
  public async command(args: CommandArgs): Promise<[boolean, string]> {
    const res = (await runCommandInternal(
      args.cmd instanceof Array ? args.cmd : args.cmd.split(" "),
      (line) => {
        if (args.logger) {
          args.logger.debug(line);
        }
      },
      args.path,
      args.throwOnFailure ?? true,
    )) as [boolean, string];

    return res;
  }

  /**
   * Gets the values of an argument.
   * @param name the name of the argument
   */
  public argValues(name: string): string[] {
    const envValues = this.envArgValues(name);
    if (envValues.length > 0) {
      return envValues;
    }

    const cliValues = this.cliArgValues(name);
    return cliValues;
  }

  /**
   * Gets the value of an argument or throws an error.
   * @param name the name of the argument
   */
  public argValue(name: string): string {
    const value = this.argValueOrDefault(name);
    if (value === undefined) {
      throw new Error(`Expected argument '${name}' to have a value.`);
    }

    return value;
  }

  /**
   * Gets the value of an argument.
   * @param name the name of the argument
   */
  public argValueOrDefault(name: string): string | undefined {
    const values = this.argValues(name);
    if (values.length == 0) {
      return undefined;
    }

    return values[0];
  }

  /**
   * Declares a dependency on an environment secret.
   * @param name the name of the secret
   */
  public secret(name: string): Extension {
    return {
      name: "secret",
      key: `secret_${name}`,
      enrich: (t) => {
        let secrets = t.properties["secrets"] as string[];
        if (secrets === undefined) {
          secrets = [];
          t.properties["secrets"] = secrets;
        }

        secrets.push(name);
      },
    };
  }

  private cliArgValues(name: string): string[] {
    const arg = this._args[name];
    if (!arg) {
      return [];
    }

    if (arg instanceof Array) {
      return arg.map((a) => a.toString());
    } else {
      return [arg.toString()];
    }
  }

  private envArgValues(name: string): string[] {
    const arg = Deno.env.get(name);
    if (!arg) {
      return [];
    }

    return [arg];
  }
}

const runtime = new Runtime();
export default runtime;
