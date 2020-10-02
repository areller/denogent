import type { LogLevel, LoggerFn } from "../../../cli/logger.ts";
import type { Graph } from "../../../internal/graph/graph.ts";
import type { Logger } from "../../core/logger.ts";
import { CIIntegration, CleanArgs, GenerateArgs } from "../ci_integration.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import * as fs from "https://deno.land/std/fs/mod.ts";
import { json2yaml } from 'https://deno.land/x/json2yaml/mod.ts';

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
            const prefix = task !== undefined ? `[${task}] ` : '';
            // deno-lint-ignore no-explicit-any
            const suffix = meta !== undefined ? ' {' + Object.entries(meta as any).map(x => ` ${x[0]} = ${x[1]}`) + ' }' : '';

            switch (level) {
                case 'debug':
                    console.log(`[DBG] ${prefix}${message}${suffix}`);
                    break;
                case 'info':
                    console.log(`[INFO] ${prefix}${message}${suffix}`);
                    break;
                case 'warn':
                    console.log(`[WARN] ${prefix}${message}${suffix}`);
                    break;
                case 'error':
                    console.error(`[ERR] ${prefix}${message}${suffix}`);
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
                            run: `deno run -A --unstable ${args.buildFile} --ci-runtime github_actions run`,
                            env: runEnv
                        }
                    ]
                }
            } 
        };

        let workflowFilePath = path.join(workflowsPath, `${args.name}.yml`);
        await fs.ensureFile(workflowFilePath);
        await Deno.writeFile(workflowFilePath, new TextEncoder().encode(json2yaml(JSON.stringify(workflow))), { create: true });

        args.logger.debug(`created '${workflowFilePath}'.`);
    }
}

/**
 * Creates a GitHub Actions CI integration.
 * @param image the image name of the CI virtual machine (e.g. 'windows-latest')
 * @param onPushBranches 
 * @param onPRBranches 
 * @param onPushTags 
 * @param secrets 
 */
export function createGitHubActions(
    image: string,
    onPushBranches?: string[],
    onPRBranches?: string[],
    onPushTags?: string[],
    secrets?: string[]
) {
    return new GitHubActions(image, onPushBranches, onPRBranches, onPushTags, secrets);
}