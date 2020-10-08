import type { CIIntegration } from "../lib/ci/ci_integration.ts";
import type { Task } from "../lib/core/task.ts";
import type { LoggerFn } from "./logger.ts";
import type { Args } from "../deps.ts";

export interface BuildContext {
    name: string;
    targetTasks: Task[];
    ciIntegrations: CIIntegration[];
}

export interface CLIContext {
    buildContext?: BuildContext,
    args: Args,
    logger: LoggerFn
}