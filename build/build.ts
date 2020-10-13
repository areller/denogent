import { createGitHubActions } from '../lib/ci/gh-actions/mod.ts';
import { createBuilder, task, deno, DenoPermissions, runtime, git, fs } from '../lib/mod.ts';
import { nodejs } from '../lib/build-kits/nodejs/mod.ts';

const nodejsSetup = nodejs.setup('latest');

const npmInstall = task('npm install')
  .dependsOn(nodejsSetup)
  .does(async ctx => {
    await runtime.command({
      cmd: ['npm', 'install'],
      logger: ctx?.logger,
    });
  });

const checkFormat = task('check format')
  .dependsOn(nodejsSetup)
  .dependsOn(npmInstall)
  .does(async ctx => {
    await runtime.command({
      cmd: ['npm', 'run', 'check-format'],
      logger: ctx?.logger,
    });
  });

const test = task('test').does(async ctx => {
  await deno.test({
    logger: ctx?.logger,
    permissions: DenoPermissions.All,
    flags: ['--unstable'],
  });
});

const replaceVersion = task('replace version')
  .dependsOn(test)
  .does(async ctx => {
    const versionFile = (await fs.getFile(['cli', 'version.ts']))!;
    let contents = await versionFile.getContentsString();
    contents = contents.replaceAll('{{VERSION}}', await getVersion());
    await versionFile.override(contents);
  });

const publish = task('publish')
  .dependsOn(runtime.secret('NEST_API_KEY'))
  .dependsOn(replaceVersion)
  .does(async ctx => {
    const run = ['deno', 'run', '-A', '--unstable', 'https://x.nest.land/eggs@0.2.3/mod.ts'];

    await runtime.command({
      cmd: [...run, 'link', runtime.argValue('NEST_API_KEY')],
      logger: ctx?.logger,
    });

    await runtime.command({
      cmd: [
        ...run,
        'publish',
        'denogent',
        '--version',
        await getVersion(),
        '--description',
        'A TypeScript build system',
      ],
      logger: ctx?.logger,
    });
  });

async function getVersion() {
  return '0.1.0';
}

createBuilder({
  name: 'denogent-build',
  targetTasks: [checkFormat, publish],
  ciIntegrations: [
    createGitHubActions({
      image: 'ubuntu-latest',
      onPRBranches: ['master'],
    }),
  ],
});
