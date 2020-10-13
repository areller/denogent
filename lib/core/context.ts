import type { CIIntegration } from '../ci/ci_integration.ts';
import type { Logger } from './logger.ts';
import type { Task } from './task.ts';

/**
 * Represents the build context
 */
export interface BuildContext {
  /**
   * The name of the build process.
   */
  name: string;
  /**
   * The target tasks that need to run.
   */
  targetTasks: Task[];
  /**
   * An array of CI system integrations
   */
  ciIntegrations: CIIntegration[];
}

/**
 * The execution context of the task
 */
export interface TaskContext {
  /**
   * The logger object.
   */
  logger: Logger;
  /**
   * The build context.
   */
  build: BuildContext;
  /**
   * The name of the CI integration under which the build is currently running.
   */
  ci?: string;
}
