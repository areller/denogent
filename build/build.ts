import { createGitHubActions } from "../lib/ci/gh-actions/mod.ts";
import { createBuilder, task, deno, DenoPermissions, runtime } from "../lib/mod.ts";
import { nodejs } from "../lib/build-kits/nodejs/mod.ts";

const nodejsSetup = nodejs.setup("latest");

const npmInstall = task("npm install")
  .dependsOn(nodejsSetup)
  .does(async ctx => {
    await runtime.command({
      cmd: ["npm", "install"],
      logger: ctx?.logger,
    });
  });

const checkFormat = task("check format")
  .dependsOn(nodejsSetup)
  .dependsOn(npmInstall)
  .does(async ctx => {
    await runtime.command({
      cmd: ["npm", "run", "check-format"],
      logger: ctx?.logger,
    });
  });

const test = task("test").does(async ctx => {
  await deno.test({
    logger: ctx?.logger,
    permissions: DenoPermissions.All,
    flags: ["--unstable"],
  });
});

createBuilder({
  name: "denogent-build",
  targetTasks: [checkFormat, test],
  ciIntegrations: [
    createGitHubActions({
      image: "ubuntu-latest",
      onPRBranches: ["master"],
    }),
  ],
});
