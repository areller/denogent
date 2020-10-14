import { stdPath } from "../deps.ts";
import { runCommand } from "../src/internal/helpers/cmd.ts";
import { emptyTempDir } from "../src/internal/testing/helpers.ts";
import { describeE2E } from "../src/internal/testing/test.ts";
import { assertEquals } from "../tests_deps.ts";
import { createBuildInTempDir, isJson } from "./common.ts";

const denogent = ["deno", "run", "-A", "--no-check", "--unstable", stdPath.join(Deno.cwd(), "denogent.ts")];

describeE2E("run.test.ts", (t) => {
  [false, true].forEach((runFromBuildFile) => {
    t.test(`'denogent run' should run generated build file (runFromBuildFile = ${runFromBuildFile})`, async () => {
      await emptyTempDir(async (temp) => {
        await runCommand([...denogent, "create"], undefined, temp, true);
        const baseCmd = !runFromBuildFile
          ? denogent
          : ["deno", "run", "-A", "--no-check", "--unstable", stdPath.join("build", "build.ts")];
        0;
        const [success] = await runCommand([...baseCmd, "run"], undefined, temp, false);
        assertEquals(success, true);
      });
    });
  });

  t.test(`'denogent run' should run prepared build file (no json)`, async () => {
    await createBuildInTempDir(async (temp) => {
      const lines: string[] = [];
      const [success] = await runCommand(
        [...denogent, "run", "--file", "build.ts"],
        (line) => {
          assertEquals(isJson(line), false);
          lines.push(line);
        },
        temp,
        false,
      );
      assertEquals(success, true);
      assertEquals(lines.filter((x) => x.indexOf("hello A") !== -1).length, 1);
      assertEquals(lines.filter((x) => x.indexOf("hello B") !== -1).length, 1);
    });
  });

  t.test(`'denogent run' should run prepared build file (json)`, async () => {
    await createBuildInTempDir(async (temp) => {
      const lines: { log: { level: string; message: string }; task: string; type: string }[] = [];
      const [success] = await runCommand(
        [...denogent, "run", "--file", "build.ts", "--json"],
        (line) => {
          assertEquals(isJson(line), true);
          lines.push(JSON.parse(line));
        },
        temp,
        false,
      );
      assertEquals(success, true);
      assertEquals(lines.length, 6);

      assertEquals([lines[0].type, lines[0].task], ["started", "taskA"]);
      assertEquals([lines[1].type, lines[1].task, lines[1].log.message], ["log", "taskA", "hello A"]);
      assertEquals([lines[2].type, lines[2].task], ["finishedSuccessfully", "taskA"]);

      assertEquals([lines[3].type, lines[3].task], ["started", "taskB"]);
      assertEquals([lines[4].type, lines[4].task, lines[4].log.message], ["log", "taskB", "hello B"]);
      assertEquals([lines[5].type, lines[5].task], ["finishedSuccessfully", "taskB"]);
    });
  });
});
