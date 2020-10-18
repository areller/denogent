import { stdPath } from "../deps.ts";
import { runCommand } from "../src/internal/helpers/cmd.ts";
import { describeE2E } from "../src/internal/testing/test.ts";
import { assertEquals } from "../tests_deps.ts";
import { createBuildInTempDir } from "./common.ts";

const denogent = ["deno", "run", "-A", "--no-check", "--unstable", stdPath.join(Deno.cwd(), "denogent.ts")];

describeE2E("check-conditions.test.ts", (t) => {
  t.test("'denogent check-conditions' should return empty when all conditions are met", async () => {
    await createBuildInTempDir(async (temp) => {
      const lines: { log: { level: string; message: string }; task: string; type: string }[] = [];
      const [success] = await runCommand(
        [...denogent, "check-conditions", "--nc", "--file", "build.bundle.ts", "--task", "taskB", "--json"],
        (line) => {
          lines.push(JSON.parse(line));
        },
        temp,
        false,
      );

      assertEquals(success, true);
      assertEquals(lines.length, 0);
    });
  });

  [false, true].forEach((fail) => {
    t.test(`'denogent check-conditions' should return failed condition (fail = ${fail})`, async () => {
      await createBuildInTempDir(async (temp) => {
        const lines: { log: { level: string; message: string }; task: string; type: string }[] = [];
        const [success] = await runCommand(
          [
            ...denogent,
            "check-conditions",
            "--nc",
            "--file",
            "build.bundle.ts",
            "--task",
            "taskB",
            "--env",
            "ARG1=no",
            "--json",
            ...(fail ? ["--fail"] : []),
          ],
          (line) => {
            lines.push(JSON.parse(line));
          },
          temp,
          false,
        );

        assertEquals(success, !fail);
        assertEquals(lines.length, 1);
        assertEquals([lines[0].task, lines[0].type], ["taskB", "failedCondition"]);
      });
    });
  });
});
