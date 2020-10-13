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
    const version = 'v0.1';
    const versionFile = (await fs.getFile(['cli', 'version.ts']))!;
    let contents = await versionFile.getContentsString();
    contents = contents.replaceAll('{{VERSION}}', version);
    await versionFile.override(contents);
  });

const publish = task('publish')
  .dependsOn(runtime.secret('NEST_API_KEY'))
  .dependsOn(replaceVersion)
  .does(async ctx => {
    await runtime.command({
      cmd: ['deno', 'install', '-A', '-f', '--unstable', '-n', 'eggs', 'https://x.nest.land/eggs@0.2.3/mod.ts'],
      logger: ctx?.logger,
    });

    await runtime.command({
      cmd: ['eggs', 'link', runtime.argValue('NEST_API_KEY')],
      logger: ctx?.logger,
    });

    await runtime.command({
      cmd: ['eggs', 'publish'],
      logger: ctx?.logger,
    });
  });

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
