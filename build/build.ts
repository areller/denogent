import { createBuilder, createGitHubActions } from "../mod.ts";
import { tasks as lintTasks } from "./build.lint.ts";
import { tasks as testTasks } from "./build.tests.ts";

createBuilder({
  name: "denogent-build",
  targetTasks: [...lintTasks, ...testTasks],
  ciIntegrations: [
    createGitHubActions({
      jobs: [
        {
          name: "lint",
          image: "ubuntu-latest",
          onlyTasks: [...lintTasks],
        },
        {
          name: "build-linux",
          image: "ubuntu-latest",
          onlyTasks: [...testTasks],
        },
        {
          name: "build-windows",
          image: "windows-latest",
          onlyTasks: [...testTasks],
        },
      ],
      onPRBranches: ["master"],
    }),
  ],
});
