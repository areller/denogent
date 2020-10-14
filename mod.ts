/*
 * Core
 */

export type { ExecFn, CondFn } from "./src/lib/core/task.ts";
export type { TaskContext, BuildContext } from "./src/lib/core/context.ts";
export type { Logger, LogLevel, LoggerFn } from "./src/lib/core/logger.ts";
export type { Extension } from "./src/lib/core/extension.ts";
export type { CreateBuilderArgs } from "./src/lib/core/builder.ts";
export { Task, task } from "./src/lib/core/task.ts";
export { createBuilder } from "./src/lib/core/builder.ts";

/*
 * CI
 */

export type { CIIntegration } from "./src/lib/ci/ci_integration.ts";

/*
 * Deno
 */

export type { DenoCommandArgs, DenoTestArgs } from "./src/lib/deno/args.ts";
export { DenoPermissions } from "./src/lib/deno/args.ts";
export { default as deno } from "./src/lib/deno/deno.ts";

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
} from "./src/lib/docker/args.ts";
export { default as docker } from "./src/lib/docker/docker.ts";

/*
 * FS
 */

export { default as fs, Folder, File } from "./src/lib/fs/fs.ts";

/*
 * Git
 */

export type { GitCommandArgs, GitSubCommandArgs } from "./src/lib/git/args.ts";
export { default as git } from "./src/lib/git/git.ts";

/*
 * Runtime
 */

export type { CommandArgs } from "./src/lib/runtime/args.ts";
export { default as runtime } from "./src/lib/runtime/runtime.ts";

/*
 * GitHub Actions
 */

export type { CreateGitHubActionsArgs } from "./src/lib/ci/gh-actions/gh-actions.ts";
export { GitHubActions, createGitHubActions } from "./src/lib/ci/gh-actions/gh-actions.ts";

/*
 * NodeJS build-kit
 */

export type { NodeJSVersion } from "./src/lib/build-kits/nodejs/nodejs.ts";
export { default as nodejs } from "./src/lib/build-kits/nodejs/nodejs.ts";
