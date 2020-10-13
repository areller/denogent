/*
 * Core
 */

export type { ExecFn, CondFn, Context } from './core/task.ts';
export type { Logger, LogLevel, LoggerFn } from './core/logger.ts';
export type { Extension } from './core/extension.ts';
export type { CreateBuilderArgs } from './core/builder.ts';
export { Task, task } from './core/task.ts';
export { createBuilder } from './core/builder.ts';

/*
 * CI
 */

export type { CIIntegration } from './ci/ci_integration.ts';

/*
 * Deno
 */

export type { DenoCommandArgs, DenoTestArgs } from './deno/args.ts';
export { DenoPermissions } from './deno/args.ts';
export { default as deno } from './deno/deno.ts';

/*
 * Docker
 */

export type {
	DockerClientArgs,
	DockerClientBuildArgs,
	DockerClientPushArgs,
	DockerRegistryCredentials,
	DockerClientSubCommandArgs,
	DockerServiceArgs,
	DockerContainerArgs,
} from './docker/args.ts';
export { default as docker } from './docker/docker.ts';

/*
 * FS
 */

export { default as fs, Folder, File } from './fs/fs.ts';

/*
 * Git
 */

export type { GitCommandArgs, GitSubCommandArgs } from './git/args.ts';
export { default as git } from './git/git.ts';

/*
 * Runtime
 */

export type { CommandArgs } from './runtime/args.ts';
export { default as runtime } from './runtime/runtime.ts';
