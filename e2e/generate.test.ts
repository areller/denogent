import { stdFs, stdPath } from "../deps.ts";
import { runCommand } from "../src/internal/helpers/cmd.ts";
import { describeE2E } from "../src/internal/testing/test.ts";
import { assertEquals } from "../tests_deps.ts";
import { createBuildInTempDir } from "./common.ts";

const denogent = ["deno", "run", "-A", "--no-check", "--unstable", stdPath.join(Deno.cwd(), "denogent.ts")];

describeE2E("generate.test.ts", (t) => {
  t.test(`'denogent generate' should generate workflow for GitHub Actions`, async () => {
    await createBuildInTempDir(async (temp) => {
      const [success] = await runCommand(
        [...denogent, "generate", "--ci", "gh-actions", "--file", "build1.ts"],
        undefined,
        temp,
        false,
      );
      assertEquals(success, true);
      assertEquals(await stdFs.exists(stdPath.join(temp, ".github", "workflows", "build.yml")), true);
    });
  });

  t.test(`'denogent generate' should generate workflow for GitHub Actions with labels`, async () => {
    await createBuildInTempDir(async (temp) => {
      const [success] = await runCommand(
        [...denogent, "generate", "--ci", "gh-actions", "--file", "build2.ts"],
        undefined,
        temp,
        false,
      );
      assertEquals(success, true);
      for await (const f of stdFs.walk(stdPath.join(temp, ".github", "workflows"))) {
        console.log(f.path);
      }
      assertEquals(await stdFs.exists(stdPath.join(temp, ".github", "workflows", "buildA.yml")), true);
      assertEquals(await stdFs.exists(stdPath.join(temp, ".github", "workflows", "buildB.yml")), true);
    });
  });
});
