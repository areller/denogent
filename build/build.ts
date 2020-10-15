import { createBuilder, task, deno, DenoPermissions, createGitHubActions } from "../mod.ts";
import { default as lintingTasks } from "./build.lint.ts";

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
  targetTasks: [...lintingTasks, test],
  ciIntegrations: [
    createGitHubActions({
      image: "ubuntu-latest",
      onPRBranches: ["master"],
      label: "build-linux",
      onlyTasks: [unitTests, e2eTests, test],
    }),
    createGitHubActions({
      image: "ubuntu-latest",
      onPushBranches: ["master"],
      label: "format",
      onlyTasks: lintingTasks,
    }),
  ],
});
