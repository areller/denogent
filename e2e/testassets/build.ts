import { createBuilder, createGitHubActions, task } from "../../mod.ts";
import runtime from "../../src/lib/runtime/runtime.ts";

const taskA = task("taskA").does(async (ctx) => {
  ctx?.logger.debug("hello A");
});

const taskB = task("taskB")
  .dependsOn(taskA)
  .when(() => runtime.argValueOrDefault("ARG1") !== "no")
  .does(async (ctx) => {
    ctx?.logger.info("hello B");
    const arg1 = runtime.argValueOrDefault("ARG1");
    const arg2 = runtime.argValueOrDefault("ARG2");

    if (arg1 && arg2) {
      ctx?.logger.info(arg1);
      ctx?.logger.info(arg2);
    }
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
