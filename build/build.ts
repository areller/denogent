import { createGitHubActions } from "../lib/ci/gh-actions/mod.ts";
import { createBuilder, task, deno, DenoPermissions } from "../lib/mod.ts";

const test = task("test")
  .does(async (ctx) => {
    await deno.test({
      logger: ctx?.logger,
      permissions: DenoPermissions.All,
      flags: ["--unstable"],
    });
  });

createBuilder({
  name: "denogent-build",
  targetTasks: test,
  ciIntegrations: [
    createGitHubActions({
      image: "ubuntu-latest",
      onPRBranches: ["master"],
    }),
  ],
});
