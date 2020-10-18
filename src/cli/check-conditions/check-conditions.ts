import { Command } from "../../../deps.ts";
import type { Task } from "../../internal/graph/graph.ts";
import type { TaskContext } from "../../lib/core/context.ts";
import { createLoggerFromFn } from "../../lib/core/logger.ts";
import type { CLIContext } from "../context.ts";

function createTaskContext(context: CLIContext): TaskContext {
  if (context.buildContext === undefined) {
    throw new Error("Expected a build context");
  }

  return {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    logger: createLoggerFromFn(() => {}),
    build: context.buildContext,
    ci: context.ciIntegration?.type,
  };
}

function writeFailedCondition(context: CLIContext, task: Task, condId: number, cond: string): void {
  context.runtime.loggerFn("info", `Failed condition (${cond})`, task.name, {
    type: "failedCondition",
    task: task.name,
    conditionId: condId,
    condition: cond,
  });

  if (context.args["fail"]) {
    Deno.exit(1);
  }
}

export function getCheckConditionsCommand(): {
  cmd: Command;
  buildContextRequired: boolean;
  action: (context: CLIContext) => Promise<void>;
} {
  return {
    cmd: new Command()
      .description("Check the conditions for a certain task.")
      .option("--task <task:string>", "The name of the task", { required: true })
      .option("--fail [:boolean]", "Exits with an error code upon failure.", { default: false }),
    buildContextRequired: true,
    action: async (context: CLIContext) => {
      if (context.graph === undefined) {
        throw new Error("Graph is unavailable.");
      }

      const taskName = context.args["task"].toString();
      const task = context.graph.getExistingTask(taskName);
      for (const [index, cond] of task.conditions.entries()) {
        const resPromise = cond(createTaskContext(context));
        const res = resPromise instanceof Promise ? await resPromise : resPromise;
        if (!res) {
          writeFailedCondition(context, task, index, cond.toString());
          return;
        }
      }
    },
  };
}
