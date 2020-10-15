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
        if (attrs.type == "started") {
          issue("group", task);
          return;
        } else if (["finishedSuccessfully", "failedCondition", "failed"].indexOf(attrs.type) != -1) {
          if (attrs.type == "failedCondition" || attrs.type == "failed") {
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
  constructor(
    private image: string,
    private dockerImage?: string,
    private onPushBranches?: string[],
    private onPRBranches?: string[],
    private onPushTags?: string[],
    private customLabel?: string,
    private onlyTasks?: Task[],
  ) {}

  public get type(): string {
    return "gh-actions";
  }

  public get label(): string | undefined {
    return this.customLabel;
  }

  public async createRuntime(args: CreateRuntimeArgs): Promise<Runtime> {
    return new GitHubActionsRuntime(args.graph);
  }

  public async clean(args: CleanArgs): Promise<void> {
    const workflowName = this.customLabel ?? args.name;
    const workflowsPath =
      args.path === undefined ? stdPath.join(".github", "workflows") : stdPath.join(args.path, ".github", "workflows");
    const workflowPath = stdPath.join(workflowsPath, `${workflowName}.yml`);

    if (!(await stdFs.exists(workflowPath))) {
      return;
    }

    await Deno.remove(workflowPath, {
      recursive: true,
    });

    args.logger.debug(`deleted workflow '${workflowPath}'.`);
  }

  public async generate(args: GenerateArgs): Promise<void> {
    const workflowName = this.customLabel ?? args.name;
    const workflowsPath =
      args.path === undefined ? stdPath.join(".github", "workflows") : stdPath.join(args.path, ".github", "workflows");
    const workflowPath = stdPath.join(workflowsPath, `${workflowName}.yml`);
    if (await stdFs.exists(workflowPath)) {
      throw new Error(`File '${workflowPath}' already exists.`);
    }

    await stdFs.ensureDir(workflowsPath);
    args.logger.debug(`created directory '${workflowsPath}'.`);

    const runEnv: { [name: string]: string } = {};

    const runtimeName = this.customLabel === undefined ? "gh-actions" : `gh-actions:${this.customLabel}`;
    const runCommand = [
      "deno",
      "run",
      "-A",
      "-q",
      "--unstable",
      args.buildFile,
      "run",
      "--serial",
      "--runtime",
      runtimeName,
    ]; // currently relies on unstable API + GitHub Actions only supports serial execution at the moment

    if (this.onlyTasks !== undefined) {
      for (const task of this.onlyTasks) {
        runCommand.push("--only", `"${task.name}"`);
      }
    }

    const workflow = {
      name: workflowName,
      on: this.buildTriggers(),
      jobs: {
        [this.image]: {
          name: this.image,
          "runs-on": this.image,
          container: this.dockerImage,
          services: this.buildServices(args, runEnv),
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
            ...this.buildUses(args),
            {
              name: "run build",
              run: runCommand.join(" "),
              env: {
                ...runEnv,
                ...this.buildSecrets(args),
              },
            },
          ],
        },
      },
    };

    await stdFs.ensureFile(workflowPath);

    const contents = "# automatically generated by denogent\n\n" + this.createYaml(workflow);
    await Deno.writeFile(workflowPath, new TextEncoder().encode(contents), {
      create: true,
    });

    args.logger.debug(`created '${workflowPath}'.`);
  }

  private buildUses(args: GenerateArgs): GHAUses[] {
    let uses: GHAUsesCollection = {};

    for (const taskName of args.graph.taskNames) {
      const task = args.graph.getExistingTask(taskName);
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

  private buildServices(args: GenerateArgs, runEnv: { [name: string]: string }) {
    const services: { [name: string]: GHAService } = {};
    for (const taskName of args.graph.taskNames) {
      const task = args.graph.getExistingTask(taskName);
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

  private buildSecrets(args: GenerateArgs): { [name: string]: string } {
    const env: { [name: string]: string } = {};

    const allSecrets = [];
    for (const taskName of args.graph.taskNames) {
      const task = args.graph.getExistingTask(taskName);
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

  private createYaml(obj: unknown): string {
    const sanitized = this.sanitizeEmptyFields(obj);
    return stringifyYaml(sanitized);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sanitizeEmptyFields(obj: unknown): any {
    if (obj instanceof Array) {
      if (obj.length == 0) {
        return undefined;
      }

      return obj.map((elem) => this.sanitizeEmptyFields(elem));
    } else if (obj instanceof Object) {
      if (Object.keys(obj).length == 0) {
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
}

export interface CreateGitHubActionsArgs {
  /**
   * an optional label
   */
  label?: string;
  /**
   * run only these tasks
   */
  onlyTasks?: Task[];
  /**
   * the image name of the CI virtual machine (e.g. 'windows-latest')
   */
  image: string;
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

/**
 * Creates a GitHub Actions CI integration.
 * @param args arguments for GitHub Actions
 */
export function createGitHubActions(args: CreateGitHubActionsArgs): GitHubActions {
  return new GitHubActions(
    args.image,
    undefined,
    args.onPushBranches,
    args.onPRBranches,
    args.onPushTags,
    args.label,
    args.onlyTasks,
  );
}
