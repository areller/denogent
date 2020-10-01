import type { LogLevel, LoggerFn } from "../../../cli/logger.ts";
import type { Graph } from "../../../internal/graph/graph.ts";
import type { Logger } from "../../core/logger.ts";
import { CIIntegration } from "../ci_integration.ts";

export class GitHubActions extends CIIntegration {
    constructor(
        /**
         * The image name of the CI virtual machine (e.g. 'windows-latest')
         */
        private image: string,
        /**
         * 
         */
        private onPushBranches?: string[],
        /**
         * 
         */
        private onPRBranches?: string[],
        /**
         * 
         */
        private onPushTags?: string[],
        /**
         * 
         */
        private secrets?: string[]
    ) {
        super();
    }

    get type(): string {
        return 'github_actions';
    }

    get logFn(): LoggerFn {
        return (level: LogLevel, message: string | Error, task?: string, meta?: unknown) => void {
            
        };
    }

    async clean(logger: Logger): Promise<void> {

    }

    async generate(buildFile: string, graph: Graph, logger: Logger): Promise<void> {

    }
}