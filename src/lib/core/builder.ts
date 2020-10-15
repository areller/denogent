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

export function createBuilder(args: CreateBuilderArgs): void {
  if (args.ciIntegrations !== undefined) {
    checkNoCIDuplicates(args.ciIntegrations);
  }

  createCLI({
    name: args.name,
    targetTasks: args.targetTasks instanceof Array ? args.targetTasks : [args.targetTasks],
    ciIntegrations: args.ciIntegrations ?? [],
  });
}

function checkNoCIDuplicates(ciIntegrations: CIIntegration[]): void {
  const labels = new Set<string>();
  const ciPerType: { [type: string]: CIIntegration[] } = {};
  for (const ci of ciIntegrations) {
    if (ci.label !== undefined) {
      if (labels.has(ci.label)) {
        throw new Error(`Label '${ci.label}' is defined more than once.`);
      }
      labels.add(ci.label);
    }

    if (ciPerType[ci.type] !== undefined && ciPerType[ci.type].length > 0) {
      if (ci.label === undefined || ciPerType[ci.type].filter((x) => x.label === undefined).length > 0) {
        throw new Error(`CI of type '${ci.type}' has declarations without labels.`);
      }
    }

    if (ciPerType[ci.type] === undefined) {
      ciPerType[ci.type] = [];
    }

    ciPerType[ci.type].push(ci);
  }
}
