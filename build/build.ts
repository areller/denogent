import { createGitHubActions } from "../lib/ci/github_actions/github_actions.ts";
import { createBuilder } from "../lib/core/builder.ts";
import { task } from "../lib/core/task.ts";
import { DenoPermissions } from "../lib/deno/args.ts";
import deno from "../lib/deno/deno.ts";
import docker from "../lib/docker/docker.ts";

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
    .when(_ => false)
    .does(async ctx => {
        await docker.client.build({
            logger: ctx?.logger,
            tag: 'test:0.1'
        });
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