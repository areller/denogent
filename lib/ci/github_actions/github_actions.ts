import type { LogLevel, LoggerFn } from "../../../cli/logger.ts";
import { CIIntegration, CleanArgs, GenerateArgs } from "../ci_integration.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import * as fs from "https://deno.land/std/fs/mod.ts";
import { json2yaml } from 'https://deno.land/x/json2yaml/mod.ts';
import { issue } from "./commands.ts";

export class GitHubActions extends CIIntegration {
    constructor(
        private image: string,
        private onPushBranches?: string[],
        private onPRBranches?: string[],
        private onPushTags?: string[],
        private secrets?: string[]
    ) {
        super();
    }

    get type(): string {
        return 'github_actions';
    }

    get logFn(): LoggerFn {
        return (level: LogLevel, message: string | Error, task?: string, meta?: unknown): void => {

            if (meta !== undefined) {
                // deno-lint-ignore no-explicit-any
                const attrs = meta as any;
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

            // deno-lint-ignore no-explicit-any
            const suffix = meta !== undefined ? ' {' + Object.entries(meta as any).map(x => ` ${x[0]} = ${x[1]}`) + ' }' : '';

            switch (level) {
                case 'debug':
                    console.log(`[DBG] ${message}${suffix}`);
                    break;
                case 'info':
                    console.log(`[INFO] ${message}${suffix}`);
                    break;
                case 'warn':
                    console.log(`[WARN] ${message}${suffix}`);
                    break;
                case 'error':
                    console.error(`[ERR] ${message}${suffix}`);
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

        fs.ensureDir(workflowsPath);
        args.logger.debug(`created directory '${workflowsPath}'.`);

        // deno-lint-ignore no-explicit-any
        let runEnv: { [name: string]: any } | undefined = undefined;
        // deno-lint-ignore no-explicit-any
        let triggers: { [name: string]: any } = { };

        const onPushBranches = this.onPushBranches ?? ['master'];
        if (onPushBranches.length > 0) {
            if (!triggers['push']) {
                triggers['push'] = {};
            }

            triggers['push']['branches'] = onPushBranches;
        }

        if (this.onPushTags !== undefined && this.onPushTags.length > 0) {
            if (!triggers['push']) {
                triggers['push'] = {};
            }

            triggers['push']['tags'] = this.onPushTags;
        }

        if (this.onPRBranches !== undefined && this.onPRBranches.length > 0) {
            if (!triggers['pull_request']) {
                triggers['pull_request'] = {};
            }

            triggers['pull_request']['branches'] = this.onPRBranches;
        }

        if (this.secrets !== undefined && this.secrets.length > 0) {
            runEnv = {};
            for (const secret of this.secrets) {
                runEnv[secret] = '${{ secrets.' + secret + ' }}';
            }
        }

        let workflow = {
            name: args.name,
            on: triggers,
            jobs: {
                [this.image]: {
                    name: this.image,
                    'runs-on': this.image,
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
                            run: `deno run -A -q --unstable ${args.buildFile} --serial --ci-runtime github_actions run`, // currently relies on unstable API + GitHub Actions only supports serial execution at the moment
                            env: runEnv
                        }
                    ]
                }
            } 
        };

        let workflowFilePath = path.join(workflowsPath, `${args.name}.yml`);
        await fs.ensureFile(workflowFilePath);

        const contents = '# automatically generated by denogent\n\n' + json2yaml(JSON.stringify(workflow));
        await Deno.writeFile(workflowFilePath, new TextEncoder().encode(contents), { create: true });

        args.logger.debug(`created '${workflowFilePath}'.`);
    }
}

export interface CreateGitHubActionsArgs {
    /**
     * the image name of the CI virtual machine (e.g. 'windows-latest')
     */
    image: string;
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
    return new GitHubActions(args.image, args.onPushBranches, args.onPRBranches, args.onPushTags, args.secrets);
}