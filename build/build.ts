import { createGitHubActions } from "../lib/ci/gh-actions/gh-actions.ts";
import { createBuilder } from "../lib/core/builder.ts";
import { task } from "../lib/core/task.ts";
import { DenoPermissions } from "../lib/deno/args.ts";
import deno from "../lib/deno/deno.ts";
import nodejs from "../lib/build-kits/nodejs/nodejs.ts";
import runtime from "../lib/runtime/runtime.ts";

const install = task('install')
    .dependsOn(nodejs.setup('latest'))
    .does(async ctx => {
        await runtime.command({ cmd: ['npm', 'install', 'express'], logger: ctx?.logger });
    });

const test = task('test')
    .dependsOn(install)
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