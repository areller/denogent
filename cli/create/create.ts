import { CLICommand, CLICommandOptionDataType, optionalFileOption } from "../cli.ts";
import type { CLIContext } from "../context.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import * as fs from "https://deno.land/std/fs/mod.ts";

async function run(context?: CLIContext): Promise<void> {
    const filePath = path.join('.', context?.args.file ?? path.join('build', 'build.ts'));
    const override = context?.args.override ?? false;

    if (await fs.exists(filePath)) {
        if (!override) {
            throw new Error(`Build file already exists at '${filePath}'.`);
        }

        await Deno.remove(filePath);
    }

    await Deno.writeFile(filePath, new TextEncoder().encode(
`import { createBuilder } from "https://deno.land/x/denogent/lib/core/builder.ts";
import { task } from "https://deno.land/x/denogent/lib/core/task.ts";

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