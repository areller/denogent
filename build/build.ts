import { createGitHubActions } from "../lib/ci/gh-actions/gh-actions.ts";
import { createBuilder } from "../lib/core/builder.ts";
import { task } from "../lib/core/task.ts";
import { DenoPermissions } from "../lib/deno/args.ts";
import deno from "../lib/deno/deno.ts";
import nodejs from "../lib/build-kits/nodejs/nodejs.ts";

const test = task('test')
    .dependsOn(nodejs.setup('12.18.1'))
    .does(async ctx => {
        await deno.test({
            logger: ctx?.logger,
            permissions: DenoPermissions.All,
            flags: ['--unstable']
        });
    });

createBuilder({
    name: 'denogent-build',
    targetTasks: test,
    ciIntegrations: [
        createGitHubActions({
            image: 'ubuntu-latest',
            onPRBranches: ['master']
        })
    ]
});