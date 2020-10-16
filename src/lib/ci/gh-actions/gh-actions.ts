import type { CIIntegration, CleanArgs, CreateRuntimeArgs, GenerateArgs } from "../ci_integration.ts";
import { issue } from "./commands.ts";
import type { Service } from "../../docker/docker.ts";
import { stdFs, stdPath, stringifyYaml } from "../../../../deps.ts";
import type { Runtime } from "../../../internal/runtime.ts";
import type { LoggerFn, LogLevel } from "../../core/logger.ts";
import type { Graph } from "../../../internal/graph/graph.ts";
import type { Task } from "../../core/task.ts";

type Triggers = {
  push?: { branches?: string[]; tags?: string[] };
  pull_request?: { branches?: string[] };
};
type GHAService = { image: string; ports: string[] };

export type GHAUses = {
  name?: string;
  uses: string;
  with?: { [name: string]: string };
};
export type GHAUsesCollection = { [name: string]: GHAUses };

class GitHubActionsRuntime implements Runtime {
  constructor(private graph: Graph) {}

  public get loggerFn(): LoggerFn {
    return (level: LogLevel, message: string | Error, task?: string, meta?: unknown): void => {
      // do not log for tasks that don't perform anything
      if (task !== undefined && this.graph.getTask(task)?.exec === undefined) {
        return;
      }

      if (meta !== undefined) {
        const attrs = meta as { type: string };
        if (attrs.type === "started") {
          issue("group", task);
          return;
        } else if (["finishedSuccessfully", "failedCondition", "failed"].indexOf(attrs.type) !== -1) {
          if (attrs.type === "failedCondition" || attrs.type === "failed") {
            console.error(message);
          }

          issue("endgroup");
          return;
        }
      }

      switch (level) {
        case "debug":
          console.log(message);
          break;
        case "info":
          console.log(message);
          break;
        case "warn":
          console.warn(message);
          break;
        case "error":
          console.error(message);
          break;
      }
    };
  }
}

export class GitHubActions implements CIIntegration {
  private dockerImage?: string = undefined;

  constructor(
    private jobs: GitHubActionsJobArgs[],
    private onPushBranches?: string[],
    private onPRBranches?: string[],
    private onPushTags?: string[],
  ) {
    this.validateJobs();
  }

  public get type(): string {
    return "gh-actions";
  }

  public async createRuntime(args: CreateRuntimeArgs): Promise<Runtime> {
    return new GitHubActionsRuntime(args.graph);
  }

  public async clean(args: CleanArgs): Promise<void> {
    const workflowsPath =
      args.path === undefined ? stdPath.join(".github", "workflows") : stdPath.join(args.path, ".github", "workflows");

    if (!(await stdFs.exists(workflowsPath))) {
      return;
    }

    await Deno.remove(workflowsPath, {
      recursive: true,
    });

    args.logger.debug(`cleaned directory '${workflowsPath}'.`);
  }

  public async generate(args: GenerateArgs): Promise<void> {
    const workflowsPath =
      args.path === undefined ? stdPath.join(".github", "workflows") : stdPath.join(args.path, ".github", "workflows");
    if (await stdFs.exists(workflowsPath)) {
      throw new Error("Folder '.github/workflows' already exists.");
    }

    await stdFs.ensureDir(workflowsPath);
    args.logger.debug(`created directory '${workflowsPath}'.`);

    const workflowJobs: { [name: string]: unknown } = {};

    for (const job of this.jobs) {
      const runEnv: { [name: string]: string } = {};

      let jobGraph = args.graph;
      if (job.onlyTasks !== undefined) {
        jobGraph = jobGraph.createSerialGraphFrom(job.onlyTasks.map((t) => t.name));
      }

      const runCommand = [
        "deno",
        "run",
        "-A",
        "-q",
        "--unstable",
        this.adjustBuildFilePathToPlatform(job.image, args.buildFile),
        "run",
        "--runtime",
        "gh-actions",
        "--serial",
      ];

      if (job.onlyTasks !== undefined) {
        for (const task of job.onlyTasks) {
          runCommand.push("--only", `"${task.name}"`);
        }
      }

      const workflowJobName = job.name ?? "build";
      const workflowJob = {
        name: workflowJobName,
        "runs-on": job.image,
        services: this.buildServices(jobGraph, runEnv),
        steps: [
          {
            name: "checkout",
            uses: "actions/checkout@v2",
          },
          {
            name: "setup deno",
            uses: "denolib/setup-deno@v2",
            with: {
              "deno-version": `v${Deno.version.deno}`,
            },
          },
          ...this.buildUses(jobGraph),
          {
            name: "run build",
            run: runCommand.join(" "),
            env: {
              ...job.env,
              ...runEnv,
              ...this.buildSecrets(jobGraph),
            },
          },
        ],
      };

      workflowJobs[workflowJobName] = workflowJob;
    }

    const workflow = {
      name: args.name,
      on: this.buildTriggers(),
      jobs: workflowJobs,
    };

    const workflowFilePath = stdPath.join(workflowsPath, `${args.name}.yml`);
    await stdFs.ensureFile(workflowFilePath);

    const contents = "# automatically generated by denogent\n\n" + this.createYaml(workflow);
    await Deno.writeFile(workflowFilePath, new TextEncoder().encode(contents), {
      create: true,
    });

    args.logger.debug(`created '${workflowFilePath}'.`);
  }

  private buildUses(graph: Graph): GHAUses[] {
    let uses: GHAUsesCollection = {};

    for (const taskName of graph.taskNames) {
      const task = graph.getExistingTask(taskName);
      const ghaUses = task.properties["gh-actions-uses"] as GHAUsesCollection;

      if (ghaUses !== undefined) {
        uses = { ...uses, ...ghaUses };
      }
    }

    return Object.values(uses);
  }

  private buildTriggers(): Triggers {
    const triggers: Triggers = {};

    const onPushBranches = this.onPushBranches ?? ["master"];
    if (onPushBranches.length > 0) {
      if (!triggers.push) {
        triggers.push = {};
      }

      triggers.push.branches = onPushBranches;
    }

    if (this.onPushTags !== undefined && this.onPushTags.length > 0) {
      if (!triggers.push) {
        triggers.push = {};
      }

      triggers.push.tags = this.onPushTags;
    }

    if (this.onPRBranches !== undefined && this.onPRBranches.length > 0) {
      if (!triggers.pull_request) {
        triggers.pull_request = {};
      }

      triggers.pull_request.branches = this.onPRBranches;
    }

    return triggers;
  }

  private buildServices(graph: Graph, runEnv: { [name: string]: string }): { [name: string]: GHAService } {
    const services: { [name: string]: GHAService } = {};
    for (const taskName of graph.taskNames) {
      const task = graph.getExistingTask(taskName);
      const dockerServices = task.properties["docker-services"] as { [name: string]: Service } | undefined;

      if (dockerServices !== undefined) {
        for (const dockerService of Object.values(dockerServices)) {
          services[dockerService.name] = {
            image: dockerService.image,
            ports: this.dockerImage === undefined ? dockerService.ports.map((p) => `${p}:${p}`) : [],
          };

          runEnv[`${dockerService.name.toUpperCase()}_HOST`] =
            this.dockerImage === undefined ? "localhost" : dockerService.name;
          if (dockerService.ports.length > 0) {
            runEnv[`${dockerService.name.toUpperCase()}_PORT`] = dockerService.ports[0].toString();
            runEnv[`${dockerService.name.toUpperCase()}_PORTS`] = dockerService.ports.join(";");
          }
        }
      }
    }

    return services;
  }

  private buildSecrets(graph: Graph): { [name: string]: string } {
    const env: { [name: string]: string } = {};

    const allSecrets = [];
    for (const taskName of graph.taskNames) {
      const task = graph.getExistingTask(taskName);
      const secrets = task.properties["secrets"] as string[];

      if (secrets !== undefined) {
        allSecrets.push(...secrets);
      }
    }

    const secretsSet = new Set(allSecrets);

    for (const secret of secretsSet.values()) {
      env[secret] = "${{ secrets." + secret + " }}";
    }

    return env;
  }

  private adjustBuildFilePathToPlatform(image: string, path: string): string {
    if (image.startsWith("windows")) {
      return path.replaceAll("/", "\\");
    } else {
      return path.replaceAll("\\", "/");
    }
  }

  private createYaml(obj: unknown): string {
    const sanitized = this.sanitizeEmptyFields(obj);
    return stringifyYaml(sanitized);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sanitizeEmptyFields(obj: unknown): any {
    if (obj instanceof Array) {
      if (obj.length === 0) {
        return undefined;
      }

      return obj.map((elem) => this.sanitizeEmptyFields(elem));
    } else if (obj instanceof Object) {
      if (Object.keys(obj).length === 0) {
        return undefined;
      }

      const newObj: { [key: string]: unknown } = {};
      for (const entry of Object.entries(obj)) {
        const value = this.sanitizeEmptyFields(entry[1]);
        if (value !== undefined) {
          newObj[entry[0]] = value;
        }
      }

      return newObj;
    }

    return obj;
  }

  private validateJobs(): void {
    if (this.jobs.length === 1) {
      return;
    } else if (this.jobs.length === 0) {
      throw new Error("[GitHub Actions] Must contain at least one job.");
    } else {
      const names = new Set<string>();
      for (const job of this.jobs) {
        if (job.name === undefined) {
          throw new Error("[GitHub Actions] All jobs must be named when multiple jobs are provided.");
        } else if (names.has(job.name)) {
          throw new Error(`[GitHub Actions] Job '${job.name}' was defined more than once.`);
        } else {
          names.add(job.name);
        }
      }
    }
  }
}

export interface CreateGitHubActionsArgsBase {
  /**
   * defines which branches will trigger a build upon push
   */
  onPushBranches?: string[];
  /**
   * defines which base branches will trigger a build upon a PR to those branches
   */
  onPRBranches?: string[];
  /**
   * defines which tags will trigger a build upon push
   */
  onPushTags?: string[];
}

export interface GitHubActionsJobArgs {
  /**
   * an optional name for the job (default: the name of the image)
   */
  name?: string;
  /**
   * the image name of the CI virtual machine (e.g. 'windows-latest')
   */
  image: string;
  /**
   * an optional array of tasks to run during the job (the tasks will run in order) (default: run all tasks)
   */
  onlyTasks?: Task[];
  /**
   * environment variables to inject during the runtime of the job
   */
  env?: { [name: string]: string };
}

type NonEmptyArray<T> = [T, ...T[]];

export interface CreateGitHubActionsArgsMultiJob extends CreateGitHubActionsArgsBase {
  /**
   * an array of jobs to run as part of the workflow
   */
  jobs: NonEmptyArray<GitHubActionsJobArgs>;
}

export type CreateGitHubActionsArgs =
  | (GitHubActionsJobArgs & CreateGitHubActionsArgsBase)
  | CreateGitHubActionsArgsMultiJob;

/**
 * Creates a GitHub Actions CI integration.
 * @param args arguments for GitHub Actions
 */
export function createGitHubActions(args: CreateGitHubActionsArgs): GitHubActions {
  return new GitHubActions(
    "jobs" in args ? args.jobs : [args],
    args.onPushBranches,
    args.onPRBranches,
    args.onPushTags,
  );
}
