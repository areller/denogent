import { stdPath } from "../../deps.ts";
import { runCommand } from "../../internal/helpers/cmd.ts";
import { emptyTempDir } from "../../internal/testing/helpers.ts";
import { describeE2E } from "../../internal/testing/test.ts";
import { assertEquals } from "../../tests_deps.ts";

const denogent = ["deno", "run", "-A", "--unstable", stdPath.join(Deno.cwd(), "denogent.ts")];

describeE2E("[e2e] run.test.ts", (t) => {
  [false, true].forEach((runFromBuildFile) => {
    t.test(`'denogent run' should run generated build file (runFromBuildFile = ${runFromBuildFile})`, async () => {
      await emptyTempDir(async (temp) => {
        await runCommand([...denogent, "create"], undefined, temp, true);
        const baseCmd = !runFromBuildFile
          ? denogent
          : ["deno", "run", "-A", "--unstable", stdPath.join("build", "build.ts")];
        0;
        const [success, _] = await runCommand([...baseCmd, "run"], undefined, temp, false);
        assertEquals(success, true);
      });
    });
  });
});
