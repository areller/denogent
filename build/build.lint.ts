import { nodejs, runtime, task } from "../mod.ts";

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

export default [npmInstall, lint];
