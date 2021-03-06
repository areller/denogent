import { stdPath } from "../deps.ts";
import type { Task } from "../src/internal/graph/graph.ts";
import { runCommand } from "../src/internal/helpers/cmd.ts";
import { describeE2E } from "../src/internal/testing/test.ts";
import { assertEquals } from "../tests_deps.ts";
import { createBuildInTempDir, isJson } from "./common.ts";

const denogent = ["deno", "run", "-A", "--no-check", "--unstable", stdPath.join(Deno.cwd(), "denogent.ts")];

describeE2E("tasks.test.ts", (t) => {
  t.test("'denogent tasks' should return list of tasks (no json)", async () => {
    await createBuildInTempDir(async (temp) => {
      const lines: string[] = [];
      const [success] = await runCommand(
        [...denogent, "tasks", "--nc", "--file", "build.bundle.ts"],
        (line) => {
          assertEquals(isJson(line), false);
          lines.push(line);
        },
        temp,
        false,
      );
      assertEquals(success, true);
      assertEquals(lines.length, 2);

      assertEquals(lines.filter((x) => x.indexOf("taskA") !== -1).length, 1);
      assertEquals(lines.filter((x) => x.indexOf("taskB") !== -1).length, 1);
    });
  });

  t.test("'denogent tasks' should return list of tasks (json)", async () => {
    await createBuildInTempDir(async (temp) => {
      const lines: { task: Task }[] = [];
      const [success] = await runCommand(
        [...denogent, "tasks", "--nc", "--file", "build.bundle.ts", "--json"],
        (line) => {
          assertEquals(isJson(line), true);
          lines.push(JSON.parse(line));
        },
        temp,
        false,
      );
      assertEquals(success, true);
      assertEquals(lines.length, 2);

      const taskA = lines.filter((x) => x.task.name === "taskA").map((x) => x.task);
      assertEquals(taskA, [
        {
          name: "taskA",
          conditions: [],
          dependencies: [],
          dependents: ["taskB"],
          tags: {},
          properties: {},
          propagateExceptions: true,
        },
      ]);

      const taskB = lines.filter((x) => x.task.name === "taskB").map((x) => x.task);
      assertEquals(taskB[0].conditions.length, 1);
      assertEquals(taskB, [
        {
          name: "taskB",
          conditions: taskB[0].conditions,
          dependencies: ["taskA"],
          dependents: [],
          tags: {},
          properties: {},
          propagateExceptions: true,
        },
      ]);
    });
  });
});
