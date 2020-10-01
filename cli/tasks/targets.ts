import { createGraph } from "../../internal/graph/graph.ts";
import { CLICommand, fileOption } from "../cli.ts";
import type { CLIContext } from "../context.ts";

async function run(context?: CLIContext): Promise<void> {
    const graph = createGraph(context?.buildContext?.targetTasks!);
}

export function tasksCommandDescription(): CLICommand {
    return {
        name: 'tasks',
        description: 'Returns the list of tasks',
        options: [
            fileOption
        ],
        fn: run
    }
}