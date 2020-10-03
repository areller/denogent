import { createGitHubActions } from "../lib/ci/github_actions/github_actions.ts";
import { createBuilder } from "../lib/core/builder.ts";
import { task } from "../lib/core/task.ts";
import { DenoPermissions } from "../lib/deno/args.ts";
import deno from "../lib/deno/deno.ts";
import { delay } from 'https://deno.land/std/async/delay.ts';

const a = task('a')
    .does(async ctx => {
        for (let i = 0; i < 10; i++) {
            ctx?.logger.info('{a} ' + i);
            await delay(1000);
        }
    });

const b = task('b')
    .does(async ctx => {
        for (let i = 0; i < 10; i++) {
            ctx?.logger.info('{b} ' + i);
            await delay(1000);
        }
    });

const test = task('test')
    .dependsOn([a, b])
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
        createGitHubActions('ubuntu-latest', ['gh-actions'])
    ]
});