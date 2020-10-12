import type { LoggerFn } from "../lib/core/logger.ts";
import type { Task } from "./graph/graph.ts";

export interface Runtime {

    /**
     * A logger function for the runtime.
     */
    loggerFn: LoggerFn;

    /**
     * Executes before the execution of the whole graph.
     */
    beforeExecution?: () => Promise<void>;
    /**
     * Executes after the execution of the whole graph.
     */
    afterExecution?: () => Promise<void>;
    /**
     * Executes before the execution of a task.
     * @param task the current executing task
     */
    beforeTaskExecution?: (task: Task) => Promise<void>;
    /**
     * Executes after the execution of a task.
     * @param task the current executing task
     * @param error the error that was thrown during the execution of the task
     */
    afterTaskExecution?: (task: Task, error: Error | undefined) => Promise<void>;
}