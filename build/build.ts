import { createGitHubActions } from "../lib/ci/gh-actions/mod.ts";
import { createBuilder, task, deno, DenoPermissions, runtime } from "../lib/mod.ts";

const checkFormat = task('check format')
    .does(async ctx => {
        //TODO: add deno command for that in lib
        await runtime.command({
            cmd: ['deno', 'fmt', '--check'],
            throwOnFailure: true,
            logger: ctx?.logger
        });
    });

const test = task('test')
    .dependsOn(checkFormat)
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