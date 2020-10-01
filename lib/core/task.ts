import type { Logger } from "./logger.ts";

export type ExecFn = (context?: Context) => Promise<void> | void;
export type CondFn = (context?: Context) => Promise<boolean> | boolean;

/**
 * The execution context of the task
 */
export interface Context {
    logger: Logger;
}

/**
 * A task represents a unit of work, that may depend or may trigger other tasks. 
 */
export class Task {

    private _exec?: ExecFn;
    private _dependencies: Task[];
    private _dependents: Task[];
    private _conditions: CondFn[];

    constructor(private _name: string) {
        this._dependencies = [];
        this._dependents = [];
        this._conditions = [];
    }

    /**
     * Defines a task or an array of task, that the current task depends on.
     * @param tasks a single task or an array of tasks
     */
    dependsOn(tasks: Task | Task[]): Task {
        if (tasks instanceof Array) {
            for (let task of tasks) {
                task._dependents.push(this);
                this._dependencies.push(task);
            }
        }
        else {
            tasks._dependents.push(this);
            this._dependencies.push(tasks);
        }

        return this;
    }

    /**
     * Defines a task or an array of task, that would be triggered by the current task's completion.
     * @param tasks a single task or an array of tasks
     */
    triggers(tasks: Task | Task[]): Task {
        if (tasks instanceof Array) {
            for (let task of tasks) {
                task._dependencies.push(this);
                this._dependents.push(task);
            }
        }
        else {
            tasks._dependencies.push(this);
            this._dependents.push(tasks);
        }

        return this;
    }

    /**
     * Defines a condition for the current task to run.
     * @param cond a condition for the current task to run
     */
    when(cond: CondFn): Task {
        this._conditions.push(cond);
        return this;
    }

    /**
     * Defines the function that the current task would executes.
     * @param exec the function that the current task executes
     */
    does(exec: ExecFn): Task {
        this._exec = exec;
        return this;
    }

    /**
     * Gets an array of tasks that the current task depends on.
     */
    get dependencies(): Task[] {
        return this._dependencies;
    }

    /**
     * Gets an array of tasks that depend on the current task.
     */
    get dependents(): Task[] {
        return this._dependents;
    }

    /**
     * Gets an array of conditions that have to met before the current task is able to run.
     */
    get conditions(): CondFn[] {
        return this._conditions;
    }

    /**
     * Gets the function that the current task executes.
     */
    get exec(): ExecFn | undefined {
        return this._exec;
    }

    /**
     * Gets the name of the current task.
     */
    get name(): string {
        return this._name;
    }
}

/**
 * Creates a new task. 
 * A task represents a unit of work, that may depend or may trigger other tasks.  
 * @param name the name of the task
 */
export function task(name: string): Task {
    return new Task(name);
}