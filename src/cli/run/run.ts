import { Command } from "../../../deps.ts";
import { ContextCreator, createExecutor } from "../../internal/executor/executor.ts";
import { createLoggerFromFn } from "../../lib/core/logger.ts";
import type { CLIContext } from "../context.ts";

function createContextCreator(context: CLIContext): ContextCreator {
  return (taskObj, eventSink) => {
    if (context.buildContext === undefined) {
      throw new Error("Expected a build context");
    }

    return {
      logger: createLoggerFromFn(
        (level, message, task, meta) =>
          eventSink({
            type: "log",
            task: task ?? "",
            level,
            meta,
            message: message instanceof Error ? message.message : message,
            error: message instanceof Error ? message : undefined,
          }),
        taskObj.name,
      ),
      build: context.buildContext,
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
      .option("--skip-conditions [:boolean]", "Skip condition checking for tasks.", { default: false })
      .option("--serial", "Run the pipeline in serial order.", { default: false })
      .option("--only [task:string]", "Run only a single task.", {
        collect: true,
        conflicts: ["except", "target"],
      })
      .option("--except [task:string]", "Run the graph except a single task.", {
        collect: true,
        conflicts: ["only"],
      })
      .option("--target [task:string]", "Run the graph with a given target.", {
        conflicts: ["only"],
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

      const only = context.args["only"];
      const except = context.args["except"];
      const target = context.args["target"];
      if (only) {
        graph = graph.createSerialGraphFrom(only instanceof Array ? only : [only]);
      } else {
        if (target) {
          graph = graph.createGraphFromTarget(target);
        }

        if (except) {
          graph = graph.createGraphExcept(except instanceof Array ? except : [except]);
        }
      }

      if (context.args["serial"]) {
        graph = graph.createSerialGraph();
      }

      if (context.args["skip-conditions"]) {
        graph = await graph.createTransformedGraph((task) => {
          const newTask = { ...task };
          newTask.conditions = [];
          return newTask;
        });
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
          if (context.runtime.beforeTaskExecution !== undefined) {
            await context.runtime.beforeTaskExecution(task);
          }
        });
      }

      if (context.runtime.afterTaskExecution !== undefined) {
        execution.afterTask(async (task, error) => {
          if (context.runtime.afterTaskExecution !== undefined) {
            await context.runtime.afterTaskExecution(task, error);
          }
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
