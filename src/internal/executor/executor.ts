import { EventEmitter } from "../../../deps.ts";
import type { TaskContext } from "../../lib/core/context.ts";
import type { Graph, Task } from "../graph/graph.ts";
import type { TaskLogEvent, TaskEvent, EventSink } from "./events.ts";

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

export type ContextCreator = (task: Task, eventSink: EventSink) => TaskContext;

export class Execution {
  private _endPromise: Promise<ExecutionResult>;
  private _resolve?: (res: ExecutionResult) => void;
  private _reject?: (reason?: Error) => void;

  private _tasksTracker: { [name: string]: TaskTracker };
  private _runningTasks: { [name: string]: Promise<void> };
  private _runningTasksCount: number;
  private _alreadyFinished: boolean;

  private _events: EventEmitter;

  private _beforeTaskFn?: (task: Task) => Promise<void>;
  private _afterTaskFn?: (task: Task, error?: Error) => Promise<void>;

  constructor(private _graph: Graph, private _contextCreator: ContextCreator) {
    this._endPromise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });

    this._tasksTracker = {};
    this._runningTasks = {};
    this._runningTasksCount = 0;
    this._alreadyFinished = false;

    this._events = new EventEmitter();
  }

  public execute(): Promise<ExecutionResult> {
    for (const name of this._graph.taskNames) {
      this._tasksTracker[name] = {
        task: this._graph.getExistingTask(name),
        dependenciesFinished: 0,
        finished: false,
        logs: [],
      };
    }

    this.spawnCollectionOfTasks(this._graph.startTasks);
    this.checkIfFinished();

    return this._endPromise;
  }

  public subscribe(fn: (event: TaskEvent) => void): void {
    this._events.addListener("_", (ev: unknown) => {
      fn(ev as TaskEvent);
    });
  }

  public beforeTask(fn: (task: Task) => Promise<void>): void {
    this._beforeTaskFn = fn;
  }

  public afterTask(fn: (task: Task, error?: Error) => Promise<void>): void {
    this._afterTaskFn = fn;
  }

  private spawnCollectionOfTasks(tasks: string[], conditionFn?: (task: Task) => boolean): void {
    // the act of spawning tasks is itself a task, so we increase the running tasks counter and then decrease it.
    // otherwise, there would race conditions where the running tasks counter could show 0, even though there are still tasks to run.

    this._runningTasksCount++;
    for (const name of tasks) {
      const task = this._graph.getExistingTask(name);
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
      const taskContext = this.createContext(task);

      // checking task conditions
      for (const [id, cond] of task.conditions.entries()) {
        const condPromise = cond(taskContext);
        let condRes: boolean;

        if (condPromise instanceof Promise) {
          condRes = await condPromise;
        } else {
          condRes = condPromise;
        }

        if (!condRes) {
          return this.finishTask(task, false, id);
        }
      }

      // running pre-task hook
      if (this._beforeTaskFn !== undefined) {
        await this._beforeTaskFn(task);
      }

      // firing task started event
      this.fireEvent({
        type: "started",
        task: task.name,
      });

      let error: Error | undefined;

      try {
        // running task
        const execTask = task.exec !== undefined ? task.exec(taskContext) : Promise.resolve();
        if (execTask instanceof Promise) {
          await execTask;
        }
      } catch (err) {
        error = err;
        throw err;
      } finally {
        // running after-task hook
        if (this._afterTaskFn !== undefined) {
          await this._afterTaskFn(task, error);
        }
      }

      // notifying that task has finished successfully
      this.finishTask(task, true);
    } catch (err) {
      if (task.propagateExceptions) {
        this.finishWithFailure(err);
      } else {
        this.finishTask(task, false, undefined, err);
      }
    }
  }

  private finishTask(task: Task, success: boolean, failedCondition?: number, error?: Error): void {
    // firing events
    if (success) {
      this.fireEvent({
        type: "finishedSuccessfully",
        task: task.name,
      });
    } else {
      if (failedCondition !== undefined) {
        this.fireEvent({
          type: "failedCondition",
          task: task.name,
          conditionId: failedCondition,
          condition: task.conditions[failedCondition].toString(),
        });
      } else {
        this.fireEvent({
          type: "failed",
          task: task.name,
          error,
        });
      }
    }

    // trying to fire dependents
    this.spawnCollectionOfTasks(task.dependents, (t) => {
      const tracker = this._tasksTracker[t.name];
      tracker.dependenciesFinished++;

      return tracker.dependenciesFinished === t.dependencies.length;
    });

    // setting task status in the tracker
    this._tasksTracker[task.name].success = success;
    if (failedCondition !== undefined) {
      this._tasksTracker[task.name].failedCondition = [failedCondition, task.conditions[failedCondition].toString()];
    }
    this._tasksTracker[task.name].error = error;
    this._tasksTracker[task.name].finished = true;

    // deleting finished task from running tasks list
    delete this._runningTasks[task.name];
    this._runningTasksCount--;

    this.checkIfFinished();
  }

  private checkIfFinished(): void {
    if (this._runningTasksCount === 0 && !this._alreadyFinished) {
      this._alreadyFinished = true;
      if (this._resolve !== undefined) {
        const tasks: { [name: string]: TaskExecutionResult } = {};
        for (const [name, taskTracker] of Object.entries(this._tasksTracker)) {
          if (taskTracker.success === undefined || taskTracker.lastEvent === undefined) {
            continue;
          }

          tasks[name] = {
            task: name,
            success: taskTracker.success ?? false,
            logs: taskTracker.logs,
            lastEvent: taskTracker.lastEvent,
          };
        }

        this._resolve({
          tasks,
        });
      }
    }
  }

  private finishWithFailure(err?: Error): void {
    if (!this._alreadyFinished) {
      this._alreadyFinished = true;
      if (this._reject !== undefined) {
        this._reject(err);
      }
    }
  }

  private fireEvent(ev: TaskEvent) {
    const tracker = this._tasksTracker[ev.task];
    if (ev.type === "log") {
      tracker.logs.push(ev);
    } else {
      tracker.lastEvent = ev;
    }

    this._events.emit("_", ev);
  }

  private createContext(task: Task): TaskContext {
    return this._contextCreator(task, this.fireEvent.bind(this));
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
  /**
   * Creates an execution for a given graph.
   * @param graph the graph object
   * @param contextCreator a function that creates a TaskContext for a given task
   */
  public fromGraph(graph: Graph, contextCreator: ContextCreator): Execution {
    return new Execution(graph, contextCreator);
  }
}

export function createExecutor(): Executor {
  return new Executor();
}
