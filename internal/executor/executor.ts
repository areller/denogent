import type { Context } from "../../lib/core/task.ts";
import type { Graph, Task } from "../graph/graph.ts";
import EventEmitter from "https://deno.land/x/events/mod.ts";
import type { LogLevel, TaskLogEvent, TaskEvent } from "./events.ts";

interface TaskTracker {
    task: Task;
    dependenciesFinished: number;
    finished: boolean;
    success?: boolean;
    failedCondition?: [number, string];
    error?: Error;
    logs: TaskLogEvent[];
    lastEvent?: TaskEvent;
}

export class Execution {

    private _endPromise: Promise<ExecutionResult>;
    private _resolve?: (res: ExecutionResult) => void;

    private _tasksTracker: { [name: string]: TaskTracker };
    private _runningTasks: { [name: string]: Promise<void> };
    private _runningTasksCount: number;
    private _alreadyFinished: boolean;

    private _events: EventEmitter;

    constructor(private _graph: Graph) {
        this._endPromise = new Promise((resolve, _) => {
            this._resolve = resolve;
        });

        this._tasksTracker = {};
        this._runningTasks = {};
        this._runningTasksCount = 0;
        this._alreadyFinished = false;

        this._events = new EventEmitter();
    }

    execute(): Promise<ExecutionResult> {
        for (const name of this._graph.taskNames) {
            this._tasksTracker[name] = {
                task: this._graph.getTask(name)!,
                dependenciesFinished: 0,
                finished: false,
                logs: []
            };
        }

        this.spawnCollectionOfTasks(this._graph.startTasks);
        this.checkIfFinished();

        return this._endPromise;
    }

    subscribe(fn: (event: TaskEvent) => void) {
        this._events.addListener('_', (ev: unknown) => {
            fn(ev as TaskEvent);
        });
    }

    private spawnCollectionOfTasks(tasks: string[], conditionFn?: (task: Task) => boolean): void {
        // the act of spawning tasks is itself a task, so we increase the running tasks counter and then decrease it.
        // otherwise, there would race conditions where the running tasks counter could show 0, even though there are still tasks to run.

        this._runningTasksCount++;
        for (const name of tasks) {
            let task = this._graph.getTask(name)!;
            let condRes = true;

            if (conditionFn !== undefined) {
                condRes = conditionFn(task);
            }

            if (condRes) {
                this.spawnTask(task);
            }
        }
        this._runningTasksCount--;
    }

    private spawnTask(task: Task): void {
        if (this._runningTasks[task.name] !== undefined) {
            return;
        }

        this._runningTasksCount++;
        this._runningTasks[task.name] = this.runTask(task);
    }

    private async runTask(task: Task): Promise<void> {
        try {
            // firing task started event
            this.fireEvent({
                type: 'started',
                task: task.name
            });

            const taskContext = this.createContext(task);

            // checking task conditions
            for (const [id, cond] of task.conditions.entries()) {
                const condPromise = cond(taskContext);
                let condRes: boolean;

                if (condPromise instanceof Promise) {
                    condRes = await condPromise;
                }
                else {
                    condRes = condPromise;
                }

                if (!condRes) {
                    return this.finishTask(task, false, id);
                }
            }

            // running task
            const execTask = task.exec !== undefined ? task.exec(taskContext) : Promise.resolve();
            if (execTask instanceof Promise) {
                await execTask;
            }

            // notifying that task has finished successfully
            this.finishTask(task, true);
        }
        catch (err) {
            this.finishTask(task, false, undefined, err);
        }
    }

    private finishTask(task: Task, success: boolean, failedCondition?: number, error?: Error): void {
        // firing events
        if (success) {
            this.fireEvent({
                type: 'finishedSuccessfully',
                task: task.name
            });
        }
        else {
            if (failedCondition !== undefined) {
                this.fireEvent({
                    type: 'failedCondition',
                    task: task.name,
                    conditionId: failedCondition,
                    condition: task.conditions[failedCondition]!.toString()
                });
            }
            else {
                this.fireEvent({
                    type: 'failed',
                    task: task.name,
                    error: error
                });
            }
        }
        
        // trying to fire dependents
        this.spawnCollectionOfTasks(task.dependents, t => {
            let tracker = this._tasksTracker[t.name];
            tracker.dependenciesFinished++;

            return tracker.dependenciesFinished == t.dependencies.length;
        });

        // setting task status in the tracker
        this._tasksTracker[task.name]!.success = success;
        if (failedCondition !== undefined) {
            this._tasksTracker[task.name]!.failedCondition = [failedCondition, task.conditions[failedCondition].toString()];
        }
        this._tasksTracker[task.name]!.error = error;
        this._tasksTracker[task.name]!.finished = true;

        // deleting finished task from running tasks list
        delete this._runningTasks[task.name];
        this._runningTasksCount--;

        this.checkIfFinished();
    }

    private checkIfFinished(): void {
        if (this._runningTasksCount == 0 && !this._alreadyFinished) {
            this._alreadyFinished = true;
            if (this._resolve !== undefined) {
                let tasks: { [name: string]: TaskExecutionResult } = {};
                for (const [name, taskTracker] of Object.entries(this._tasksTracker)) {
                    tasks[name] = {
                        task: name,
                        success: taskTracker.success!,
                        logs: taskTracker.logs,
                        lastEvent: taskTracker.lastEvent!
                    };
                }

                this._resolve({
                    tasks
                });
            }
        }
    }

    private fireEvent(ev: TaskEvent) {
        const tracker = this._tasksTracker[ev.task]!;
        if (ev.type == 'log') {
            tracker.logs.push(ev);
        }
        else {
            tracker.lastEvent = ev;
        }

        this._events.emit('_', ev);
    }

    private writeLogToTask(task: Task, level: LogLevel, msg: string | Error, meta?: unknown) {
        const event: TaskLogEvent = {
            type: 'log',
            task: task.name,
            level: level,
            message: msg instanceof Error ? msg.message : msg,
            error: msg instanceof Error ? msg : undefined
        };

        this.fireEvent(event);
    }

    private createContext(task: Task): Context {
        return {
            logger: {
                debug: (msg, meta) => this.writeLogToTask(task, 'debug', msg, meta),
                info: (msg, meta) => this.writeLogToTask(task, 'info', msg, meta),
                warn: (msg, meta) => this.writeLogToTask(task, 'warn', msg, meta),
                error: (msg: string | Error, meta?: unknown) => this.writeLogToTask(task, 'error', msg, meta)
            }
        }
    }
}

export interface TaskExecutionResult {
    task: string;
    success: boolean;
    logs: TaskLogEvent[];
    lastEvent: TaskEvent;
}

export interface ExecutionResult {
    tasks: { [name: string]: TaskExecutionResult };
}

export class Executor {

    constructor() {}

    fromGraph(graph: Graph): Execution {
        return new Execution(graph);
    }
}

export function createExecutor() {
    return new Executor();
}