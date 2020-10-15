import { createBuilder, task, deno, DenoPermissions, runtime, createGitHubActions, nodejs } from "../mod.ts";

const nodejsSetup = nodejs.setup("latest");

const npmInstall = task("npm install")
  .dependsOn(nodejsSetup)
  .does(async (ctx) => {
    await runtime.command({
      cmd: ["npm", "install"],
      logger: ctx?.logger,
    });
  });

const lint = task("lint")
  .dependsOn(nodejsSetup)
  .dependsOn(npmInstall)
  .when((ctx) => ctx?.ci !== undefined)
  .does(async (ctx) => {
    await runtime.command({
      cmd: ["npm", "run", "lint"],
      logger: ctx?.logger,
    });
  });

const unitTests = task("unit tests").does(async (ctx) => {
  await deno.test({
    logger: ctx?.logger,
    permissions: DenoPermissions.All,
    flags: ["--unstable"],
    files: "src",
  });
});

const e2eTests = task("e2e tests")
  .dependsOn(unitTests)
  .does(async (ctx) => {
    await deno.test({
      logger: ctx?.logger,
      permissions: DenoPermissions.All,
      flags: ["--unstable"],
      files: "e2e",
    });
  });

const test = task("test").dependsOn([unitTests, e2eTests]);

createBuilder({
  name: "denogent-build",
  targetTasks: [lint, test],
  ciIntegrations: [
    createGitHubActions({
      image: "windows-latest",
      onPRBranches: ["master"],
    }),
  ],
});
