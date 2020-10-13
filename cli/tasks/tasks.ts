import { Command } from '../../deps.ts';
import type { CLIContext } from '../context.ts';

export function getTasksCommand(): {
  cmd: Command;
  buildContextRequired: boolean;
  action: (context: CLIContext) => Promise<void>;
} {
  return {
    cmd: new Command().description('Return the list of tasks in the pipeline.'),
    buildContextRequired: true,
    action: async (context: CLIContext) => {
      if (context.graph === undefined) {
        throw new Error('Graph is unavailable.');
      }

      for (const taskName of context.graph.taskNames) {
        const task = context.graph.getTask(taskName)!;
        context.runtime.loggerFn('info', taskName, undefined, { task });
      }
    },
  };
}
