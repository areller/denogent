import { createBuilder, createGitHubActions } from "../mod.ts";
import { target as lint } from "./build.lint.ts";
import { target as test } from "./build.tests.ts";

createBuilder({
  name: "denogent-build",
  targetTasks: [lint, test],
  ciIntegrations: [
    createGitHubActions({
      jobs: [
        {
          name: "lint",
          image: "ubuntu-latest",
          targetTask: lint,
        },
        {
          name: "build-linux",
          image: "ubuntu-latest",
          targetTask: test,
        },
        {
          name: "build-windows",
          image: "windows-latest",
          targetTask: test,
        },
      ],
      onPRBranches: ["master"],
    }),
  ],
});
