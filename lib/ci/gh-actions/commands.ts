// https://github.com/actions/toolkit/blob/master/packages/core/src/command.ts

interface CommandProperties {
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
}

/**
 * Commands
 *
 * Command Format:
 *   ::name key=value,key=value::message
 *
 * Examples:
 *   ::warning::This is the message
 *   ::set-env name=MY_VAR::some value
 */
export function issueCommand(
  command: string,
  properties: CommandProperties,
  // deno-lint-ignore no-explicit-any
  message: any,
): void {
  const cmd = new Command(command, properties, message);
  console.log(cmd.toString());
}

export function issue(name: string, message?: string): void {
  issueCommand(name, {}, message ?? "");
}

const CMD_STRING = "::";

class Command {
  private readonly command: string;
  private readonly message: string;
  private readonly properties: CommandProperties;

  constructor(command: string, properties: CommandProperties, message: string) {
    if (!command) {
      command = "missing.command";
    }

    this.command = command;
    this.properties = properties;
    this.message = message;
  }

  public toString(): string {
    let cmdStr = CMD_STRING + this.command;

    if (this.properties && Object.keys(this.properties).length > 0) {
      cmdStr += " ";
      let first = true;
      for (const key in this.properties) {
        // deno-lint-ignore no-prototype-builtins
        if (this.properties.hasOwnProperty(key)) {
          const val = this.properties[key];
          if (val) {
            if (first) {
              first = false;
            } else {
              cmdStr += ",";
            }

            cmdStr += `${key}=${escapeProperty(val)}`;
          }
        }
      }
    }

    cmdStr += `${CMD_STRING}${escapeData(this.message)}`;
    return cmdStr;
  }
}

/**
 * Sanitizes an input into a string so it can be passed into issueCommand safely
 * @param input input to sanitize into a string
 */
// deno-lint-ignore no-explicit-any
export function toCommandValue(input: any): string {
  if (input === null || input === undefined) {
    return "";
  } else if (typeof input === "string" || input instanceof String) {
    return input as string;
  }
  return JSON.stringify(input);
}

// deno-lint-ignore no-explicit-any
function escapeData(s: any): string {
  return toCommandValue(s).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

// deno-lint-ignore no-explicit-any
function escapeProperty(s: any): string {
  return toCommandValue(s)
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A")
    .replace(/:/g, "%3A")
    .replace(/,/g, "%2C");
}
