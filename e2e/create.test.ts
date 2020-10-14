import { stdFs, stdPath } from "../deps.ts";
import { runCommand } from "../src/internal/helpers/cmd.ts";
import { emptyTempDir } from "../src/internal/testing/helpers.ts";
import { describeE2E } from "../src/internal/testing/test.ts";
import { assertEquals } from "../tests_deps.ts";

const denogent = ["deno", "run", "-A", "--unstable", stdPath.join(Deno.cwd(), "denogent.ts")];

describeE2E("create.test.ts", (t) => {
  [undefined, stdPath.join("build", "build.ts"), stdPath.join("build", "build2.ts")].forEach((filePath) => {
    t.test(`'denogent create' should create build file (--file = ${filePath})`, async () => {
      await emptyTempDir(async (temp) => {
        const [success] = await runCommand(
          [...denogent, "create", ...(filePath !== undefined ? ["--file", filePath] : [])],
          undefined,
          temp,
          false,
        );
        assertEquals(success, true);
        assertEquals(
          await stdFs.exists(stdPath.join(temp, filePath === undefined ? stdPath.join("build", "build.ts") : filePath)),
          true,
        );
      });
    });
  });
});
