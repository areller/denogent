import { task } from "../../lib/core/task.ts";
import { createGraph, Task } from "../graph/graph.ts";
import { describe } from "../testing/test.ts";
import { createExecutor, ExecutionResult } from "./executor.ts";
import { assertEquals, assertNotEquals, fail } from "../../../tests_deps.ts";
import type { EventSink, TaskEvent, TaskFailedConditionEvent, TaskFailedEvent } from "./events.ts";
import type { TaskContext } from "../../lib/core/context.ts";
import { createLoggerFromFn } from "../../lib/core/logger.ts";

describe("executor.test.ts", (t) => {
  t.test("single task", async () => {
    const graph = createGraph([task("taskA")]);
    const execution = createExecutor().fromGraph(graph, createContext);
    const res = await execution.execute();

    assertEquals(res, {
      tasks: {
        ["taskA"]: {
          task: "taskA",
          success: true,
          logs: [],
          lastEvent: {
            type: "finishedSuccessfully",
            task: "taskA",
          },
        },
      },
    });
  });

  t.test("single task (hooks)", async () => {
    const log: string[] = [];

    const graph = createGraph([
      task("taskA").does(() => {
        log.push("taskA");
      }),
    ]);
    const execution = createExecutor().fromGraph(graph, createContext);

    execution.beforeTask(async (task) => {
      log.push("pre: " + task.name);
    });

    execution.afterTask(async (task, error) => {
      assertEquals(error, undefined);
      log.push("post: " + task.name);
    });

    const res = await execution.execute();

    assertEquals(res, {
      tasks: {
        ["taskA"]: {
          task: "taskA",
          success: true,
          logs: [],
          lastEvent: {
            type: "finishedSuccessfully",
            task: "taskA",
          },
        },
      },
    });

    assertEquals(log, ["pre: taskA", "taskA", "post: taskA"]);
  });

  t.test("single task (events)", async () => {
    const graph = createGraph([
      task("taskA").does((ctx) => {
        ctx?.logger.debug("hello");
      }),
    ]);
    const execution = createExecutor().fromGraph(graph, createContext);

    const eventLog: TaskEvent[] = [];

    execution.subscribe((ev) => {
      eventLog.push(ev);
    });

    const res = await execution.execute();

    assertEquals(res, {
      tasks: {
        ["taskA"]: {
          task: "taskA",
          success: true,
          logs: [
            {
              type: "log",
              task: "taskA",
              level: "debug",
              message: "hello",
              error: undefined,
              meta: undefined,
            },
          ],
          lastEvent: {
            type: "finishedSuccessfully",
            task: "taskA",
          },
        },
      },
    });

    assertEquals(eventLog, [
      {
        type: "started",
        task: "taskA",
      },
      {
        type: "log",
        task: "taskA",
        level: "debug",
        message: "hello",
        error: undefined,
        meta: undefined,
      },
      {
        type: "finishedSuccessfully",
        task: "taskA",
      },
    ]);
  });

  t.test("single task (failed condition)", async () => {
    const graph = createGraph([
      task("taskA")
        .when(() => false)
        .does((ctx) => {
          ctx?.logger.debug("hello");
        }),
    ]);
    const execution = createExecutor().fromGraph(graph, createContext);

    const eventLog: TaskEvent[] = [];

    execution.subscribe((ev) => {
      eventLog.push(ev);
    });

    const res = await execution.execute();

    assertEquals(res, {
      tasks: {
        ["taskA"]: {
          task: "taskA",
          success: false,
          logs: [],
          lastEvent: {
            type: "failedCondition",
            task: "taskA",
            conditionId: 0,
            condition: (res.tasks["taskA"].lastEvent as TaskFailedConditionEvent).condition,
          },
        },
      },
    });
    assertEquals((res.tasks["taskA"].lastEvent as TaskFailedConditionEvent).condition.replaceAll(" ", ""), "()=>false");

    assertEquals(eventLog, [
      {
        type: "failedCondition",
        task: "taskA",
        conditionId: 0,
        condition: (eventLog[0] as TaskFailedConditionEvent).condition,
      },
    ]);
    assertEquals((eventLog[0] as TaskFailedConditionEvent).condition.replaceAll(" ", ""), "()=>false");
  });

  [false, true].forEach((propagateExceptions) => {
    t.test(`single task (failed and propagateExceptions = ${propagateExceptions ? "true" : "false"})`, async () => {
      const graph = createGraph([
        task("taskA")
          .breakCircuit(!propagateExceptions)
          .does((ctx) => {
            ctx?.logger.debug("hello");
            throw new Error("failure.");
          }),
      ]);
      const execution = createExecutor().fromGraph(graph, createContext);

      const eventLog: TaskEvent[] = [];

      execution.subscribe((ev) => {
        eventLog.push(ev);
      });

      let res: ExecutionResult | undefined;

      try {
        res = await execution.execute();
      } catch (err) {
        if (!propagateExceptions) {
          return fail("propagated exception");
        }

        assertEquals(eventLog, [
          {
            type: "started",
            task: "taskA",
          },
          {
            type: "log",
            task: "taskA",
            level: "debug",
            message: "hello",
            error: undefined,
            meta: undefined,
          },
        ]);
      }

      if (res !== undefined) {
        if (propagateExceptions) {
          return fail("didn't propagate exception");
        }

        assertEquals(res, {
          tasks: {
            ["taskA"]: {
              task: "taskA",
              success: false,
              logs: [
                {
                  type: "log",
                  task: "taskA",
                  level: "debug",
                  message: "hello",
                  error: undefined,
                  meta: undefined,
                },
              ],
              lastEvent: {
                type: "failed",
                task: "taskA",
                error: (res.tasks["taskA"].lastEvent as TaskFailedEvent).error,
              },
            },
          },
        });
        assertEquals((res.tasks["taskA"].lastEvent as TaskFailedEvent).error?.message, "failure.");
      }
    });
  });

  [false, true].forEach((propagateExceptions) => {
    t.test(
      `single task (afterTask is called) (failed and propagateExceptions = ${propagateExceptions ? "true" : "false"})`,
      async () => {
        const log: string[] = [];

        const graph = createGraph([
          task("taskA")
            .breakCircuit(!propagateExceptions)
            .does(() => {
              log.push("taskA");
              throw new Error("failure.");
            }),
        ]);
        const execution = createExecutor().fromGraph(graph, createContext);

        execution.beforeTask(async (task) => {
          log.push("pre: " + task.name);
        });

        execution.afterTask(async (task, error) => {
          assertNotEquals(error, undefined);
          log.push("post: " + task.name + " " + error?.message ?? "");
        });

        try {
          await execution.execute();
          // eslint-disable-next-line no-empty
        } catch (err) {}

        assertEquals(log, ["pre: taskA", "taskA", "post: taskA failure."]);
      },
    );
  });

  t.test("two tasks", async () => {
    const taskA = task("taskA").does((ctx) => ctx?.logger.debug("helloA"));
    const taskB = task("taskB")
      .dependsOn(taskA)
      .does((ctx) => ctx?.logger.debug("helloB"));
    const graph = createGraph([taskB]);
    const execution = createExecutor().fromGraph(graph, createContext);

    const eventLog: TaskEvent[] = [];

    execution.subscribe((ev) => {
      eventLog.push(ev);
    });

    const res = await execution.execute();

    assertEquals(res, {
      tasks: {
        ["taskA"]: {
          task: "taskA",
          success: true,
          logs: [
            {
              type: "log",
              task: "taskA",
              level: "debug",
              message: "helloA",
              error: undefined,
              meta: undefined,
            },
          ],
          lastEvent: {
            type: "finishedSuccessfully",
            task: "taskA",
          },
        },
        ["taskB"]: {
          task: "taskB",
          success: true,
          logs: [
            {
              type: "log",
              task: "taskB",
              level: "debug",
              message: "helloB",
              error: undefined,
              meta: undefined,
            },
          ],
          lastEvent: {
            type: "finishedSuccessfully",
            task: "taskB",
          },
        },
      },
    });
  });

  [false, true].forEach((propagateExceptions) => {
    t.test(`two tasks (first failed and propagateExceptions = ${propagateExceptions ? "true" : "false"})`, async () => {
      const taskA = task("taskA")
        .breakCircuit(!propagateExceptions)
        .does((ctx) => {
          ctx?.logger.debug("helloA");
          throw new Error("failure.");
        });
      const taskB = task("taskB")
        .dependsOn(taskA)
        .does((ctx) => ctx?.logger.debug("helloB"));
      const graph = createGraph([taskB]);
      const execution = createExecutor().fromGraph(graph, createContext);

      const eventLog: TaskEvent[] = [];

      execution.subscribe((ev) => {
        eventLog.push(ev);
      });

      let res: ExecutionResult | undefined;

      try {
        res = await execution.execute();
      } catch (err) {
        if (!propagateExceptions) {
          return fail("propagated exception");
        }

        assertEquals(eventLog, [
          {
            type: "started",
            task: "taskA",
          },
          {
            type: "log",
            task: "taskA",
            level: "debug",
            message: "helloA",
            error: undefined,
            meta: undefined,
          },
        ]);
      }

      if (res !== undefined) {
        if (propagateExceptions) {
          return fail("didn't propagate exception");
        }

        assertEquals(res, {
          tasks: {
            ["taskA"]: {
              task: "taskA",
              success: false,
              logs: [
                {
                  type: "log",
                  task: "taskA",
                  level: "debug",
                  message: "helloA",
                  error: undefined,
                  meta: undefined,
                },
              ],
              lastEvent: {
                type: "failed",
                task: "taskA",
                error: (res.tasks["taskA"].lastEvent as TaskFailedEvent).error,
              },
            },
            ["taskB"]: {
              task: "taskB",
              success: true,
              logs: [
                {
                  type: "log",
                  task: "taskB",
                  level: "debug",
                  message: "helloB",
                  error: undefined,
                  meta: undefined,
                },
              ],
              lastEvent: {
                type: "finishedSuccessfully",
                task: "taskB",
              },
            },
          },
        });
        assertEquals((res.tasks["taskA"].lastEvent as TaskFailedEvent).error?.message, "failure.");
      }
    });
  });
});

function createContext(task: Task, eventSink: EventSink): TaskContext {
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
      task.name,
    ),
    build: {
      name: "build",
      targetTasks: [],
      ciIntegrations: [],
    },
  };
}
