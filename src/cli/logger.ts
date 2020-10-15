import { Colors } from "../../deps.ts";
import type { LogLevel } from "../lib/core/logger.ts";

export function simpleLog(level: LogLevel, message: string | Error, task?: string, meta?: unknown): void {
  const prefix = task !== undefined ? `[${task}] ` : "";
  const suffix =
    meta !== undefined
      ? " {" + Object.entries(meta as { [key: string]: unknown }).map((x) => ` ${x[0]} = ${x[1]}`) + " }"
      : "";

  switch (level) {
    case "debug":
      console.log(Colors.gray(`${prefix}${message}${suffix}`));
      break;
    case "info":
      console.log(Colors.white(`${prefix}${message}${suffix}`));
      break;
    case "warn":
      console.log(Colors.yellow(`${prefix}${message}${suffix}`));
      break;
    case "error":
      console.error(Colors.red(`${prefix}${message}${suffix}`));
      if (message instanceof Error) {
        console.error(Colors.red(message.stack?.toString() ?? ""));
      }
      break;
  }
}

function createJSON(level: LogLevel, message: string | Error, task?: string, meta?: unknown): unknown {
  return {
    log: {
      level,
      message: typeof message === "string" ? message : message.message,
      stack: typeof message === "string" ? undefined : message.stack,
    },
    task,
    ...((meta || {}) as { [key: string]: unknown }),
  };
}

export function jsonStreamLog(level: LogLevel, message: string | Error, task?: string, meta?: unknown): void {
  console.log(JSON.stringify(createJSON(level, message, task, meta)));
}
