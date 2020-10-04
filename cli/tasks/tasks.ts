import { createGraph } from "../../internal/graph/graph.ts";
import { CLICommand, fileOption } from "../cli.ts";
import type { CLIContext } from "../context.ts";

async function run(context?: CLIContext): Promise<void> {
    const graph = createGraph(context?.buildContext?.targetTasks!);
    for (const name of graph.taskNames) {
        const task = graph.getTask(name)!;
        context?.logger('info', task.name, undefined, {
            task
        });
    }
}

export function tasksCommandDescription(): CLICommand {
    return {
        name: 'tasks',
        description: 'Returns the list of tasks',
        options: [
            fileOption
        ],
        requireBuildContext: true,
        fn: run
    }
}