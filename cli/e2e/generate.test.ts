import { stdFs, stdPath } from "../../deps.ts";
import { runCommand } from "../../internal/helpers/cmd.ts";
import { describeE2E } from "../../internal/testing/test.ts";
import { assertEquals } from "../../tests_deps.ts";
import { createBuildInTempDir } from "./common.ts";

const denogent = ["deno", "run", "-A", "--no-check", "--unstable", stdPath.join(Deno.cwd(), "denogent.ts")];

describeE2E('generate.test.ts', t => {
    t.test(`'denogent generate' should generate workflow for GitHub Actions`, async () => {
        await createBuildInTempDir(async temp => {
            const [success, _] = await runCommand([...denogent, 'generate', '--ci', 'gh-actions', '--file', 'build.ts'], undefined, temp, false);
            assertEquals(success, true);
            assertEquals(await stdFs.exists(stdPath.join(temp, '.github', 'workflows', 'build.yml')), true);
        });
    });
});