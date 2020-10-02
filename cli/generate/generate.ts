import { createGraph } from "../../internal/graph/graph.ts";
import { CLICommand, CLICommandOptionDataType, fileOption } from "../cli.ts";
import type { CLIContext } from "../context.ts";

async function run(context?: CLIContext): Promise<void> {
    const graph = createGraph(context?.buildContext?.targetTasks!);
    const ciName = context?.args.ci.toString();
    const ciArray = context?.buildContext?.ciIntegrations.filter(c => c.type == ciName);

    if (ciArray === undefined || ciArray.length == 0) {
        throw new Error(`unknown CI integration '${ciName}'.`);
    }

    const ci = ciArray[0];

    const logger = {
        debug: (msg: string, meta: unknown) => context?.logger('debug', msg, undefined, meta),
        info: (msg: string, meta: unknown) => context?.logger('info', msg, undefined, meta),
        warn: (msg: string, meta: unknown) => context?.logger('warn', msg, undefined, meta),
        error: (msg: string | Error, meta?: unknown) => context?.logger('error', msg, undefined, meta)
    };

    await ci.clean({ logger });
    await ci.generate({
        name: context?.buildContext?.name!,
        buildFile: context?.args.file,
        graph,
        logger
    });
}

export function generateCommandDescription(): CLICommand {
    return {
        name: 'generate',
        description: 'Generate files for a CI integration',
        options: [
            fileOption,
            {
                name: 'ci',
                description: `The name of the CI integration (e.g. 'github_actions')`,
                dataType: CLICommandOptionDataType.String,
                required: true
            }
        ],
        fn: run
    };
}