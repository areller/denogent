import type { Args } from "https://deno.land/std@0.70.0/flags/mod.ts";
import type { CIIntegration } from "../lib/ci/ci_integration.ts";
import type { Task } from "../lib/core/task.ts";
import type { LoggerFn } from "./logger.ts";

export interface BuildContext {
    targetTasks: Task[];
    ciIntegrations: CIIntegration[];
}

export interface CLIContext {
    buildContext?: BuildContext,
    args: Args,
    logger: LoggerFn
}