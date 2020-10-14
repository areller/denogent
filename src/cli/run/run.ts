import { Command } from "../../../deps.ts";
import { ContextCreator, createExecutor } from "../../internal/executor/executor.ts";
import { createLoggerFromFn } from "../../lib/core/logger.ts";
import type { CLIContext } from "../context.ts";

function createContextCreator(context: CLIContext): ContextCreator {
  return (taskObj, eventSink) => {
    return {
      logger: createLoggerFromFn(
        (level, message, task, meta) =>
          eventSink({
            type: "log",
            task: task!,
            level,
            meta,
            message: message instanceof Error ? message.message : message,
            error: message instanceof Error ? message : undefined,
          }),
        taskObj.name,
      ),
      build: context.buildContext!,
      ci: context.ciIntegration?.type,
    };
  };
}

export function getRunCommand(): {
  cmd: Command;
  buildContextRequired: boolean;
  action: (context: CLIContext) => Promise<void>;
} {
  return {
    cmd: new Command()
      .description("Run the pipeline that is defined in the build file.")
      .option("--serial", "Run the pipeline in serial order.", {
        conflicts: ["only"],
      })
      .option("--only [task:string]", "Run only a single task.", {
        conflicts: ["serial"],
      }),
    buildContextRequired: true,
    action: async (context: CLIContext) => {
      if (context.buildContext === undefined) {
        throw new Error("Build context is unavailable.");
      }
      if (context.graph === undefined) {
        throw new Error("Graph is unavailable.");
      }

      const executor = createExecutor();
      let graph = context.graph;

      if (context.args["serial"]) {
        graph = graph.createSerialGraph();
      } else if (context.args["only"]) {
        graph = graph.createSerialGraphFrom([context.args["only"].toString()]);
      }

      const execution = executor.fromGraph(graph, createContextCreator(context));

      execution.subscribe((ev) => {
        switch (ev.type) {
          case "started":
            context.runtime.loggerFn("info", `=== STARTED '${ev.task}' ===`, ev.task, { type: ev.type, task: ev.task });
            break;
          case "log":
            context.runtime.loggerFn(ev.level, ev.message, ev.task, {
              type: ev.type,
              task: ev.task,
            });
            break;
          case "finishedSuccessfully":
            context.runtime.loggerFn("info", `=== FINISHED '${ev.task}' ===`, ev.task, {
              type: ev.type,
              task: ev.task,
            });
            break;
          case "failedCondition":
            context.runtime.loggerFn("warn", `Failed condition (${ev.condition})`, ev.task, {
              type: ev.type,
              task: ev.task,
              conditionId: ev.conditionId,
              condition: ev.condition,
            });
            break;
          case "failed":
            context.runtime.loggerFn("error", ev.error || "Failed", ev.task, {
              type: ev.type,
              task: ev.task,
            });
            break;
        }
      });

      if (context.runtime.beforeTaskExecution !== undefined) {
        execution.beforeTask(async (task) => {
          await context.runtime.beforeTaskExecution!(task);
        });
      }

      if (context.runtime.afterTaskExecution !== undefined) {
        execution.afterTask(async (task, error) => {
          await context.runtime.afterTaskExecution!(task, error);
        });
      }

      try {
        if (context.runtime.beforeExecution !== undefined) {
          await context.runtime.beforeExecution();
        }

        try {
          await execution.execute();
        } finally {
          if (context.runtime.afterExecution !== undefined) {
            await context.runtime.afterExecution();
          }
        }
      } catch (error) {
        context.runtime.loggerFn("error", error);
        Deno.exit(1);
      }
    },
  };
}
