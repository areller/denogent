import { Command } from "../../../deps.ts";
import { createLoggerFromFn } from "../../lib/core/logger.ts";
import type { CLIContext } from "../context.ts";
import { selectCIsFromFilter } from "./ci_selector.ts";

export function getGenerateCommand(): {
  cmd: Command;
  buildContextRequired: boolean;
  action: (context: CLIContext) => Promise<void>;
} {
  return {
    cmd: new Command()
      .description("Generate files for a CI integration.")
      .option("--ci <type:string>", `The name of the CI integration (e.g. 'gh-actions').`, {
        required: false,
        collect: true,
        conflicts: ["all", "label"],
      })
      .option("--all [:boolean]", "Generate for all declared CI integrations.", {
        required: false,
        conflicts: ["ci", "label"],
      })
      .option("--label <label:string>", "The custom label that was given to the CI integration.", {
        required: false,
        conflicts: ["all", "ci"],
      })
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

      const cis = selectCIsFromFilter(context.buildContext.ciIntegrations, {
        all: context.args["all"] !== undefined,
        ci:
          context.args["ci"] !== undefined
            ? context.args["ci"] instanceof Array
              ? context.args["ci"]
              : [context.args["ci"]]
            : undefined,
        label:
          context.args["label"] !== undefined
            ? context.args["label"] instanceof Array
              ? context.args["label"]
              : [context.args["label"]]
            : undefined,
      });

      const logger = createLoggerFromFn(context.runtime.loggerFn);

      for (const ci of cis) {
        await ci.clean({ logger, name: context.buildContext.name });

        if (!context.args["clean"]) {
          await ci.generate({
            name: context.buildContext.name,
            buildFile: context.buildFile,
            graph: context.graph,
            logger,
          });
        }
      }
    },
  };
}
