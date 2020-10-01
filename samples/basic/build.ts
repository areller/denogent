import { task } from "../../lib/core/task.ts";
import { delay } from 'https://deno.land/std/async/delay.ts';
import git from "../../lib/git/git.ts";
import { createBuilder } from "../../lib/core/builder.ts";

const isTagged = await git.isTagged({ logger: false });

const clean = task('clean')
    .does(async ctx => {
        ctx?.logger.info('start cleaning');
        await delay(1000);
        ctx?.logger.info('done cleaning');
    });

const build = task('build')
    .dependsOn(clean)
    .does(async ctx => {
        ctx?.logger.info('start building');
        await delay(2000);
        ctx?.logger.info('done building');
    });

const test = task('test')
    .when(() => !isTagged)
    .dependsOn(build)
    .does(async ctx => {
        ctx?.logger.info('start testing');
        await delay(5000);
        ctx?.logger.info('done testing');
    });

const pack = task('pack')
    .when(() => !isTagged)
    .dependsOn(build)
    .does(async ctx => {
        ctx?.logger.info('start packing');
        await delay(3000);
        ctx?.logger.info('done packing');
    });

const deploy = task('deploy')
    .when(() => isTagged)
    .dependsOn(pack)
    .does(async ctx => {
        ctx?.logger.info('start deploying');
        await delay(1000);
        ctx?.logger.info('done deploying');
    });

const sendEmail = task('sendEmail')
    .dependsOn([deploy, test])
    .does(async ctx => {
        await delay(500);
        ctx?.logger.info('sent email');
    });

const done = task('done')
    .dependsOn([sendEmail]);

createBuilder({
    name: 'sample-a',
    targetTasks: test
});