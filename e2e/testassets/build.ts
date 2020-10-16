import { createBuilder, createGitHubActions, task } from "../../mod.ts";

const taskA = task("taskA").does(async (ctx) => {
  ctx?.logger.debug("hello A");
});

const taskB = task("taskB")
  .dependsOn(taskA)
  .does(async (ctx) => {
    ctx?.logger.info("hello B");
  });

createBuilder({
  name: "build",
  targetTasks: taskB,
  ciIntegrations: [
    createGitHubActions({
      image: "ubuntu-latest",
    }),
  ], // define CI integrations here
});
