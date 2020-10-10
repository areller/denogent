import { stdFs, stdPath } from "../../deps.ts";
import { CLICommand, CLICommandOptionDataType, optionalFileOption } from "../cli.ts";
import type { CLIContext } from "../context.ts";

async function run(context?: CLIContext): Promise<void> {
    const filePath = stdPath.join('.', context?.args.file ?? stdPath.join('build', 'build.ts'));
    const override = context?.args.override ?? false;

    if (await stdFs.exists(filePath)) {
        if (!override) {
            throw new Error(`Build file already exists at '${filePath}'.`);
        }

        await Deno.remove(filePath);
    }

    await stdFs.ensureFile(filePath);
    await Deno.writeFile(filePath, new TextEncoder().encode(
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
`));

    context?.logger('info', `Created '${filePath}'.`);
}

export function createCommandDescription(): CLICommand {
    return {
        name: 'create',
        description: 'Create a new build file',
        options: [
            optionalFileOption,
            {
                name: 'override',
                description: 'Override an existing build file',
                dataType: CLICommandOptionDataType.Boolean,
                required: false
            }
        ],
        requireBuildContext: false,
        fn: run
    };
}