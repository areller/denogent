import { Command } from "../../../deps.ts";
import { createLoggerFromFn } from "../../lib/core/logger.ts";
import type { CLIContext } from "../context.ts";

export function getGenerateCommand(): {
  cmd: Command;
  buildContextRequired: boolean;
  action: (context: CLIContext) => Promise<void>;
} {
  return {
    cmd: new Command()
      .description("Generate files for a CI integration.")
      .option("--ci <type:string>", `The name of the CI integration (e.g. 'gh-actions').`, { required: true })
      .option("--clean [:boolean]", "Only perform a clean.", {
        default: false,
      }),
    buildContextRequired: true,
    action: async (context: CLIContext) => {
      if (context.buildFile === undefined) {
        throw new Error("Build file is unavailable.");
      }
      if (context.buildContext === undefined) {
        throw new Error("Build context is unavailable.");
      }
      if (context.graph === undefined) {
        throw new Error("Graph is unavailable.");
      }

      const ciName = context.args["ci"].toString();
      const ciArray = context.buildContext.ciIntegrations.filter((c) => c.type === ciName);

      if (ciArray === undefined || ciArray.length === 0) {
        throw new Error(`Unknown CI integration '${ciName}'.`);
      }

      const ci = ciArray[0];
      const logger = createLoggerFromFn(context.runtime.loggerFn);

      await ci.clean({ logger });

      if (!context.args["clean"]) {
        await ci.generate({
          name: context.buildContext.name,
          buildFile: context.buildFile,
          graph: context.graph,
          logger,
        });
      }
    },
  };
}
