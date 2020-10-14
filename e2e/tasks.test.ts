import { stdPath } from "../deps.ts";
import type { Task } from "../src/internal/graph/graph.ts";
import { runCommand } from "../src/internal/helpers/cmd.ts";
import { describeE2E } from "../src/internal/testing/test.ts";
import { assertEquals } from "../tests_deps.ts";
import { createBuildInTempDir, isJson } from "./common.ts";

const denogent = ["deno", "run", "-A", "--no-check", "--unstable", stdPath.join(Deno.cwd(), "denogent.ts")];

describeE2E("tasks.test.ts", (t) => {
  t.test(`'denogent tasks' should return list of tasks (no json)`, async () => {
    await createBuildInTempDir(async (temp) => {
      let lines: string[] = [];
      const [success, _] = await runCommand(
        [...denogent, "tasks", "--file", "build.ts"],
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

  t.test(`'denogent tasks' should return list of tasks (json)`, async () => {
    await createBuildInTempDir(async (temp) => {
      let lines: { task: Task }[] = [];
      const [success, _] = await runCommand(
        [...denogent, "tasks", "--file", "build.ts", "--json"],
        (line) => {
          assertEquals(isJson(line), true);
          lines.push(JSON.parse(line));
        },
        temp,
        false,
      );
      assertEquals(success, true);
      assertEquals(lines.length, 2);

      assertEquals(
        lines.filter((x) => x.task.name == "taskA").map((x) => x.task),
        [
          {
            name: "taskA",
            conditions: [],
            dependencies: [],
            dependents: ["taskB"],
            tags: {},
            properties: {},
            propagateExceptions: true,
          },
        ],
      );

      assertEquals(
        lines.filter((x) => x.task.name == "taskB").map((x) => x.task),
        [
          {
            name: "taskB",
            conditions: [],
            dependencies: ["taskA"],
            dependents: [],
            tags: {},
            properties: {},
            propagateExceptions: true,
          },
        ],
      );
    });
  });
});
