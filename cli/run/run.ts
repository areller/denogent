import { createExecutor } from "../../internal/executor/executor.ts";
import { createGraph, Graph } from "../../internal/graph/graph.ts";
import { runCommand } from "../../internal/helpers/cmd.ts";
import { CLICommand, CLICommandOptionDataType, fileOption } from "../cli.ts";
import type { CLIContext } from "../context.ts";
import { v4 } from "https://deno.land/std/uuid/mod.ts";
import { createCommandDescription } from "../create/create.ts";

type Service = { name: string, image: string, ports: number[] };

async function run(context?: CLIContext): Promise<void> {
    let graph = createGraph(context?.buildContext?.targetTasks!);
    const executor = createExecutor();

    if (context?.args.only) {
        graph = graph.createSerialGraphFrom([context.args.only.toString()]);
    }
    else if (context?.args.serial) {
        if (typeof context?.args.serial == 'boolean') {
            graph = graph.createSerialGraph();
        }
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

    let containerNames: string[] = [];
    try {
        console.log(context?.args);
        if (!context?.args['skip-services']) {
            await launchDockerServices(context!, graph, containerNames);
        }

        await execution.execute();
    }
    finally {
        await removeDockerServices(containerNames);
    }
}

async function launchDockerServices(context: CLIContext, graph: Graph, containerNames: string[]): Promise<void> {
    let services: { [name: string]: Service } = {};
    for (const taskName of graph.taskNames) {
        const task = graph.getTask(taskName)!;
        const dockerServices = task.tags['docker-services'];

        if (dockerServices !== undefined) {
            for (const dockerServiceRef of dockerServices) {
                const dockerService = task.properties[dockerServiceRef]! as Service;
                services[dockerService.name] = dockerService;
            }
        }
    }

    if (Object.keys(services).length == 0) {
        return;
    }

    if (!(await runCommand(['docker', '--version'], undefined, undefined, false))[0]) {
        throw new Error(`Docker is not installed.`);
    }

    for (const service of Object.values(services)) {
        const id = v4.generate().replaceAll('-', '');
        let cmd = ['docker', 'run', '--rm', '--name', id, '-idt'];
        for (const port of service.ports) {
            cmd.push('-p', `${port}:${port}`);
        }

        cmd.push(service.image);

        await runCommand(cmd, line => {
            context.logger('debug', line);
        });

        containerNames.push(id);

        Deno.env.set(`${service.name.toUpperCase()}_HOST`, 'localhost');
        if (service.ports.length > 0) {
            Deno.env.set(`${service.name.toUpperCase()}_PORT`, service.ports[0].toString());
            Deno.env.set(`${service.name.toUpperCase()}_PORTS`, service.ports.join(';'));
        }
    }
}

async function removeDockerServices(containerNames: string[]): Promise<void> {
    if (containerNames.length == 0) {
        return;
    }

    for (const name of containerNames) {
        await runCommand(['docker', 'rm', '-f', name]);
    }
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
            },
            {
                name: 'skip-services',
                description: 'Do not run dependent services',
                dataType: CLICommandOptionDataType.Boolean,
                required: false
            }
        ],
        requireBuildContext: true,
        fn: run
    };
}