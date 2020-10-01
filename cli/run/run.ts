import { createExecutor } from "../../internal/executor/executor.ts";
import { createGraph, Graph } from "../../internal/graph/graph.ts";
import { CLICommand, CLICommandOptionDataType, fileOption } from "../cli.ts";
import type { CLIContext } from "../context.ts";

async function run(context?: CLIContext): Promise<void> {
    let graph = createGraph(context?.buildContext?.targetTasks!);
    const executor = createExecutor();

    if (context?.args.only) {
        graph = graph.createSerialGraphFrom([context.args.only.toString()]);
    }

    const execution = executor.fromGraph(graph);

    execution.subscribe(ev => {
        switch (ev.type) {
            case 'started':
                context?.logger('info', `=== STARTED '${ev.task}' ===`, ev.task, { type: ev.type, task: ev.task });
                break;
            case 'log':
                context?.logger(ev.level, ev.message, ev.task, { type: ev.type, task: ev.task });
                break;
            case 'finishedSuccessfully':
                context?.logger('info', `=== FINISHED '${ev.task}' ===`, ev.task, { type: ev.type, task: ev.task });
                break;
            case 'failedCondition':
                context?.logger('warn', `Failed condition (${ev.condition})`, ev.task, { type: ev.type, task: ev.task, conditionId: ev.conditionId, condition: ev.condition });
                break;
            case 'failed':
                context?.logger('error', ev.error || 'Failed', ev.task, { type: ev.type, task: ev.task });
                break;
        }
    });

    await execution.execute();
}

export function runCommandDescription(): CLICommand {
    return {
        name: 'run',
        description: 'Run the tasks in the build file',
        options: [
            fileOption,
            {
                name: 'serial',
                description: 'Run the tasks in series',
                dataType: CLICommandOptionDataType.Boolean | CLICommandOptionDataType.StringArray,
                required: false
            },
            {
                name: 'parallel',
                description: 'Run the tasks in parallel',
                dataType: CLICommandOptionDataType.Boolean | CLICommandOptionDataType.StringArray,
                required: false
            },
            {
                name: 'only',
                description: 'Run a single task',
                dataType: CLICommandOptionDataType.String,
                required: false
            }
        ],
        fn: run
    };
}