import { createCLI } from "../../cli/cli.ts";
import type { CIIntegration } from "../ci/ci_integration.ts";
import type { Task } from "./task.ts";

export interface CreateBuilderArgs {
    /**
     * The name of the build process.
     */
    name: string;
    /**
     * The target tasks or task that need to run.
     */
    targetTasks: Task | Task[];

    /**
     * An array of CI system integrations.
     */
    ciIntegrations?: CIIntegration[];

}

export function createBuilder(args: CreateBuilderArgs) {
    createCLI({
        name: args.name,
        targetTasks: args.targetTasks instanceof Array ? args.targetTasks : [args.targetTasks],
        ciIntegrations: args.ciIntegrations ?? []
    });
}