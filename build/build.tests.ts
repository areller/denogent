import { stdPath } from "../deps.ts";
import { deno, DenoPermissions, fs, task } from "../mod.ts";
import { bundleFile } from "./helpers.ts";

const unitTests = task("unit tests").does(async (ctx) => {
  await deno.test({
    logger: ctx?.logger,
    permissions: DenoPermissions.All,
    flags: ["--unstable"],
    files: "src",
  });
});

const bundle = task("bundle test assets").does(async (ctx) => {
  const testAssets = await fs.getFolder(["e2e", "testassets"]);
  if (testAssets === undefined) {
    return;
  }

  for (const asset of await testAssets.listFiles()) {
    const nameParsed = stdPath.parse(asset.name);
    if (nameParsed.ext.indexOf("bundle") !== -1) {
      continue;
    }

    const bundleFilePath = stdPath.join(testAssets.path, `${nameParsed.name}.bundle.ts`);
    await bundleFile(asset.path, bundleFilePath);
    ctx?.logger.debug(`Bundled '${bundleFilePath}'.`);
  }
});

const e2eTests = task("e2e tests")
  .dependsOn([unitTests, bundle])
  .does(async (ctx) => {
    await deno.test({
      logger: ctx?.logger,
      permissions: DenoPermissions.All,
      flags: ["--unstable"],
      files: "e2e",
    });
  });

const test = task("test").dependsOn([unitTests, e2eTests]);

const tasks = [unitTests, bundle, e2eTests, test];
export { tasks };
