import { copyDirToTemp, emptyTempDir, mockDebugLogger } from "../../internal/testing/helpers.ts";
import { describe } from "../../internal/testing/test.ts";
import runtime from "./runtime.ts";
import { task } from "../core/task.ts";
import { assertEquals, fail } from "../../../tests_deps.ts";
import { stdFs, stdPath } from "../../../deps.ts";
import { getCurrentImportPath, isUnix, isWindows } from "../../internal/helpers/env.ts";

const assetsPath = stdPath.join(getCurrentImportPath(import.meta.url), "testassets");

describe("runtime.test.ts", (t) => {
  t.test(
    "command should run a command (unix)",
    async () => {
      await emptyTempDir(async (temp) => {
        await runtime.command({ path: temp, cmd: ["touch", "a"], logger: false });
        await runtime.command({ path: temp, cmd: ["touch", "b"], logger: false });

        const lines: string[] = [];
        const [success, output] = await runtime.command({
          path: temp,
          cmd: "ls",
          logger: mockDebugLogger((line) => lines.push(line)),
        });

        assertEquals(success, true);
        assertEquals(lines, ["a", "b"]);
        assertEquals(output, "a\nb\n");
      });
    },
    () => isUnix(),
  );

  t.test(
    "command should run a command (windows)",
    async () => {
      await emptyTempDir(async (temp) => {
        await runtime.command({ path: temp, cmd: ["fsutil", "file", "createnew", "a", "1000"], logger: false });
        await runtime.command({ path: temp, cmd: ["fsutil", "file", "createnew", "b", "1000"], logger: false });

        assertEquals(await stdFs.exists(stdPath.join(temp, "a")), true);
        assertEquals(await stdFs.exists(stdPath.join(temp, "b")), true);
      });
    },
    () => isWindows(),
  );

  t.test(
    "command should run shell command (windows)",
    async () => {
      const [success] = await runtime.command({ cmd: ["dir"], logger: false });
      assertEquals(success, true);
    },
    () => isWindows(),
  );

  [false, true, undefined].forEach((throws) => {
    t.test(
      "command " +
        (throws === true || throws === undefined ? "should" : "shouldn't") +
        " throw an exception when fails",
      async () => {
        await copyDirToTemp(assetsPath, async (temp) => {
          try {
            const [status] = await runtime.command({
              path: temp,
              cmd: ["deno", "run", "--no-check", "-A", "fail.ts"],
              logger: false,
              throwOnFailure: throws,
            });
            if (throws === true || throws === undefined) {
              fail("no exception was thrown");
            }

            assertEquals(status, false);
          } catch (error) {
            if (throws === true || throws === undefined) {
              assertEquals(error.message, "Command 'deno run --no-check -A fail.ts' has failed.");
            } else {
              fail("exception was thrown");
            }
          }
        });
      },
    );
  });

  t.test("argValue should get value from env", async () => {
    Deno.env.set("someKey", "someVal");
    const someKey = runtime.argValue("someKey");

    assertEquals(someKey, "someVal");
  });

  t.test("secret injects secret into secrets property", () => {
    const taskA = task("taskA");
    taskA.dependsOn([runtime.secret("secretA"), runtime.secret("secretB")]);
    const secrets = taskA.properties["secrets"] as string[];

    assertEquals(secrets, ["secretA", "secretB"]);
  });
});
