import type { CIIntegration } from "../lib/ci/ci_integration.ts";
import type { Task } from "../lib/core/task.ts";
import type { Args } from "../deps.ts";
import type { Runtime } from "../internal/runtime.ts";
import type { Graph } from "../internal/graph/graph.ts";

export interface BuildContext {
  name: string;
  targetTasks: Task[];
  ciIntegrations: CIIntegration[];
}

export interface CLIContext {
  buildContext?: BuildContext;
  buildFile?: string;
  graph?: Graph;
  args: Args;
  runtime: Runtime;
}
