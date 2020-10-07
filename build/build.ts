import { createGitHubActions } from "../lib/ci/gh-actions/gh-actions.ts";
import { createBuilder } from "../lib/core/builder.ts";
import { task } from "../lib/core/task.ts";
import { DenoPermissions } from "../lib/deno/args.ts";
import deno from "../lib/deno/deno.ts";
import docker from "../lib/docker/docker.ts";
import runtime from "../lib/runtime/runtime.ts";

const test = task('test')
    .does(async ctx => {
        await deno.test({
            logger: ctx?.logger,
            permissions: DenoPermissions.All,
            flags: ['--unstable']
        });
    });

const build = task('build')
    .dependsOn(test)
    .does(async ctx => {
        await docker.client.build({
            logger: ctx?.logger,
            tag: 'arellerdh/test:0.1'
        });
    });

const push = task('push')
    .dependsOn(build)
    .dependsOn([runtime.secret('docker_username'), runtime.secret('docker_password')])
    .does(async ctx => {
        await docker.client.push({
            logger: ctx?.logger,
            tag: 'arellerdh/test:0.1',
            credentials: {
                username: runtime.argValue('docker_username'),
                password: runtime.argValue('docker_password')
            }
        })
    });

createBuilder({
    name: 'denogent-build',
    targetTasks: build,
    ciIntegrations: [
        createGitHubActions({
            image: 'ubuntu-latest',
            onPRBranches: ['master']
        })
    ]
});