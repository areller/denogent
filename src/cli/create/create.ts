import { Command, stdFs } from "../../../deps.ts";
import type { CLIContext } from "../context.ts";

export function getCreateCommand(): {
  cmd: Command;
  buildContextRequired: boolean;
  action: (context: CLIContext) => Promise<void>;
} {
  return {
    cmd: new Command().description("Create a new build file").option("--override", "Override an existing build file.", {
      default: false,
    }),
    buildContextRequired: false,
    action: async (context: CLIContext) => {
      if (context.buildFile === undefined) {
        throw new Error("Build file is unavailable.");
      }

      const filePath = context.buildFile;
      const override = context.args["override"] ?? false;

      if (await stdFs.exists(filePath)) {
        if (!override) {
          throw new Error(`Build file already exists at '${filePath}'.`);
        }

        await Deno.remove(filePath);
      }

      await stdFs.ensureFile(filePath);
      await Deno.writeFile(
        filePath,
        new TextEncoder().encode(
          `import { createBuilder, task } from "https://deno.land/x/denogent/lib/mod.ts";

const someTask = task('some task')
    .does(async ctx => {
        // do something here
        ctx?.logger.info('doing something');
    });

createBuilder({
    name: 'build',
    targetTasks: someTask,
    ciIntegrations: [] // define CI integrations here
});
`,
        ),
      );

      context.runtime.loggerFn("info", `Created '${filePath}'.`);
    },
  };
}
