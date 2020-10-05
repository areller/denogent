import type { LogLevel, LoggerFn } from "../../../cli/logger.ts";
import type { CIIntegration, CleanArgs, GenerateArgs } from "../ci_integration.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import * as fs from "https://deno.land/std/fs/mod.ts";
import { stringify } from "https://deno.land/std/encoding/yaml.ts";
import { issue } from "./commands.ts";
import type { Service } from "../../docker/docker.ts";

type Triggers = { push?: { branches?: string[], tags?: string[] }, pull_request?: { branches?: string[] } };
type GHAService = { image: string, ports: string[] };

export class GitHubActions implements CIIntegration {
    constructor(
        private image: string,
        private dockerImage?: string,
        private onPushBranches?: string[],
        private onPRBranches?: string[],
        private onPushTags?: string[],
        private secrets?: string[]
    ) {
    }

    get type(): string {
        return 'github_actions';
    }

    get logFn(): LoggerFn {
        return (level: LogLevel, message: string | Error, task?: string, meta?: unknown): void => {

            if (meta !== undefined) {
                const attrs = meta as { type: string };
                if (attrs.type == 'started') {
                    issue('group', task);
                    return;
                }

                else if (['finishedSuccessfully', 'failedCondition', 'failed'].indexOf(attrs.type) != -1) {
                    if (attrs.type == 'failedCondition' || attrs.type == 'failed') {
                        console.error(message);
                    }

                    issue('endgroup');
                    return;
                }
            }

            switch (level) {
                case 'debug':
                    console.log(message);
                    break;
                case 'info':
                    console.log(message);
                    break;
                case 'warn':
                    console.warn(message);
                    break;
                case 'error':
                    console.error(message);
                    break;
            }
        };
    }

    async clean(args: CleanArgs): Promise<void> {
        const workflowsPath = path.join('.github', 'workflows');

        if (!(await fs.exists(workflowsPath))) {
            return;
        }

        await Deno.remove(workflowsPath, {
            recursive: true
        });

        args.logger.debug(`cleaned directory '${workflowsPath}'.`);
    }

    async generate(args: GenerateArgs): Promise<void> {
        const workflowsPath = path.join('.github', 'workflows');
        if (await fs.exists(workflowsPath)) {
            throw new Error(`Folder '.github/workflows' already exists.`);
        }

        await fs.ensureDir(workflowsPath);
        args.logger.debug(`created directory '${workflowsPath}'.`);

        let runEnv: { [name: string]: string } = {};
        for (const secret of this.secrets ?? []) {
            runEnv[secret] = '${{ secrets.' + secret + ' }}';
        }

        let workflow = {
            name: args.name,
            on: this.buildTriggers(args),
            jobs: {
                [this.image]: {
                    name: this.image,
                    'runs-on': this.image,
                    container: this.dockerImage,
                    services: this.buildServices(args, runEnv),
                    steps: [
                        {
                            name: 'checkout',
                            uses: 'actions/checkout@v2'
                        },
                        {
                            name: 'setup deno',
                            uses: 'denolib/setup-deno@v2',
                            with: {
                                'deno-version': `v${Deno.version.deno}`
                            }
                        },
                        {
                            name: 'run build',
                            run: `deno run -A -q --unstable ${args.buildFile} --serial --skip-services --ci-runtime github_actions run`, // currently relies on unstable API + GitHub Actions only supports serial execution at the moment
                            env: runEnv
                        }
                    ]
                }
            }
        };

        const workflowFilePath = path.join(workflowsPath, `${args.name}.yml`);
        await fs.ensureFile(workflowFilePath);

        const contents = '# automatically generated by denogent\n\n' + this.createYaml(workflow);
        await Deno.writeFile(workflowFilePath, new TextEncoder().encode(contents), { create: true });

        args.logger.debug(`created '${workflowFilePath}'.`);
    }

    private buildTriggers(args: GenerateArgs): Triggers {
        let triggers: Triggers = {};
        
        const onPushBranches = this.onPushBranches ?? ['master'];
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
        let services: { [name: string]: GHAService } = {};
        for (const taskName of args.graph.taskNames) {
            const task = args.graph.getTask(taskName)!;
            const dockerServices = task.properties['docker-services'] as { [name: string]: Service } | undefined;

            if (dockerServices !== undefined) {
                for (const dockerService of Object.values(dockerServices)) {
                    services[dockerService.name] = {
                        image: dockerService.image,
                        ports: this.dockerImage === undefined ? dockerService.ports.map(p => `${p}:${p}`) : []
                    };

                    runEnv[`${dockerService.name.toUpperCase()}_HOST`] = this.dockerImage === undefined ? 'localhost' : dockerService.name;
                    if (dockerService.ports.length > 0) {
                        runEnv[`${dockerService.name.toUpperCase()}_PORT`] = dockerService.ports[0].toString();
                        runEnv[`${dockerService.name.toUpperCase()}_PORTS`] = dockerService.ports.join(';');
                    }
                }
            }
        }

        return services;
    }

    // deno-lint-ignore no-explicit-any
    private createYaml(obj: any): string {
        const sanitized = this.sanitizeEmptyFields(obj);
        return stringify(sanitized);
    }

    // deno-lint-ignore no-explicit-any
    private sanitizeEmptyFields(obj: any): any {
        if (obj instanceof Array) {
            if (obj.length == 0) {
                return undefined;
            }

            return obj.map(elem => this.sanitizeEmptyFields(elem));
        }
        else if (obj instanceof Object) {
            if (Object.keys(obj).length == 0) {
                return undefined;
            }

            // deno-lint-ignore no-explicit-any
            let newObj: any = {};
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
     * the image name of the CI virtual machine (e.g. 'windows-latest')
     */
    image: string;
    /**
     * if defined, GitHub Actions will run the pipeline from within a given docker image
     */
    //dockerImage?: string;
    /**
     * 
     */
    onPushBranches?: string[],
    /**
     * 
     */
    onPRBranches?: string[];
    /**
     * 
     */
    onPushTags?: string[];
    /**
     * 
     */
    secrets?: string[]
}

/**
 * Creates a GitHub Actions CI integration.
 * @param args arguments for GitHub Actions
 */
export function createGitHubActions(args: CreateGitHubActionsArgs) {
    return new GitHubActions(args.image, undefined, args.onPushBranches, args.onPRBranches, args.onPushTags, args.secrets);
}