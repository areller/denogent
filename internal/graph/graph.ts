import type { ExecFn, CondFn, Task as TaskDef } from "../../lib/core/task.ts";
import { breadthFirst, breadthFirstWithDepth } from "../helpers/algos.ts";

/**
 * Represents a task
 */
export interface Task {
  name: string;
  exec?: ExecFn;
  conditions: CondFn[];
  dependencies: string[];
  dependents: string[];
  tags: { [name: string]: string[] };
  properties: { [name: string]: unknown };
  propagateExceptions: boolean;
}

/**
 * Represents a graph where the vertices/nodes are individual tasks
 */
export class Graph {
  private _names: string[];
  private _startTasks: string[];
  private _endTasks: string[];

  constructor(private _tasks: { [name: string]: Task }, targetTasks: string[]) {
    this._names = Object.keys(this._tasks);
    this._startTasks = this.findStartTasks(targetTasks);
    this._endTasks = this.findEndTasks(this._startTasks);
  }

  /**
     * Gets an instance of a task by its name.
     * @param name the name of the task
     */
  getTask(name: string): Task | undefined {
    return this._tasks[name];
  }

  /**
     * Creates a graph that would run given tasks in a serial order.
     * @param taskNames the names of the tasks
     */
  createSerialGraphFrom(taskNames: string[]): Graph {
    if (taskNames.length == 0) {
      return new Graph({}, []);
    }

    let lastTask: Task | undefined = undefined;
    let newTasks: { [name: string]: Task } = {};

    for (const name of taskNames) {
      let task = this._tasks[name];
      if (task === undefined) {
        throw new Error(`task '${name}' is not defined.`);
      }

      let detachedTask: Task = {
        name: task.name,
        exec: task.exec,
        conditions: task.conditions,
        dependencies: [],
        dependents: [],
        tags: task.tags,
        properties: task.properties,
        propagateExceptions: task.propagateExceptions,
      };

      if (lastTask !== undefined) {
        detachedTask.dependencies.push(lastTask.name);
        lastTask.dependents.push(detachedTask.name);
      }

      lastTask = detachedTask;
      newTasks[task.name] = detachedTask;
    }

    return new Graph(newTasks, [lastTask!.name]);
  }

  /**
     * Creates a graph that would run given tasks in parallel.
     * @param taskNames the names of the tasks
     */
  createParallelGraphFrom(taskNames: string[]): Graph {
    if (taskNames.length == 0) {
      return new Graph({}, []);
    }

    let newTasks: { [name: string]: Task } = {};

    for (const name of taskNames) {
      let task = this._tasks[name];
      if (task === undefined) {
        throw new Error(`task '${name}' is not defined.`);
      }

      let detachedTask: Task = {
        name: task.name,
        exec: task.exec,
        conditions: task.conditions,
        dependencies: [],
        dependents: [],
        tags: task.tags,
        properties: task.properties,
        propagateExceptions: task.propagateExceptions,
      };

      newTasks[task.name] = detachedTask;
    }

    return new Graph(newTasks, taskNames);
  }

  /**
     * Creates a graph that would run all tasks of current graph in serial order.
     */
  createSerialGraph(): Graph {
    return this.createSerialGraphFrom(this.getAllTasksInOrder());
  }

  /**
     * Creates a graph that would run all tasks of current graph in parallel. 
     */
  createParallelGraph(): Graph {
    return this.createParallelGraphFrom(this.getAllTasksInOrder());
  }

  /**
     * Returns a map from a level to an array of tasks in that level.  
     * The tasks in each level depend on the tasks in the level above.  
     * The tasks in the first level (level = 0) are the tasks without dependencies and are the first to run in the graph, while the tasks in the last level are the last to run in the graph.
     */
  getTasksByLevel(): { [level: number]: Task[] } {
    let map: { [level: number]: Task[] } = {};

    breadthFirstWithDepth(
      this.taskObjects(this.startTasks),
      (t) => this.taskObjects(t.dependents),
      (t) => this.taskObjects(t.dependencies),
      (t, level) => {
        let tasksOfLevel = map[level];
        if (tasksOfLevel === undefined) {
          tasksOfLevel = [];
          map[level] = tasksOfLevel;
        }

        tasksOfLevel.push(t);
      },
    );

    return map;
  }

  /**
     * Gets the tasks with no dependencies, and the first to run in the graph.
     */
  get startTasks() {
    return this._startTasks;
  }

  /**
     * Gets the tasks with no dependents.
     */
  get targetTasks() {
    return this._endTasks;
  }

  /**
     * Gets an array of the names of all the tasks in the graph.
     */
  get taskNames() {
    return this._names;
  }

  private findStartTasks(endTasks: string[]): string[] {
    let startTasks: string[] = [];

    breadthFirst(
      this.taskObjects(endTasks),
      (t) => this.taskObjects(t.dependencies),
      (t) => {
        if (t.dependencies.length == 0) {
          startTasks.push(t.name);
        }
      },
    );

    return startTasks;
  }

  private findEndTasks(startTasks: string[]): string[] {
    let endTasks: string[] = [];

    breadthFirst(
      this.taskObjects(startTasks),
      (t) => this.taskObjects(t.dependents),
      (t) => {
        if (t.dependents.length == 0) {
          endTasks.push(t.name);
        }
      },
    );

    return endTasks;
  }

  private taskObjects(names: string[]): Task[] {
    return names.map((n) => this._tasks[n]);
  }

  private getAllTasksInOrder(): string[] {
    let tasks: string[] = [];
    for (const level of Object.values(this.getTasksByLevel())) {
      for (const task of level) {
        tasks.push(task.name);
      }
    }

    return tasks;
  }
}

export function createGraph(targetTasks: TaskDef[]) {
  const tasks: { [name: string]: Task } = {};

  breadthFirst(targetTasks, (t) => t.dependencies.concat(t.dependents), (t) => {
    let task = tasks[t.name];
    if (task !== undefined) {
      throw new Error(`task '${t.name}' is defined more than once.`);
    }

    task = {
      name: t.name,
      exec: t.exec,
      conditions: t.conditions,
      dependencies: t.dependencies.map((d) => d.name),
      dependents: t.dependents.map((d) => d.name),
      tags: t.tags,
      properties: t.properties,
      propagateExceptions: t.propagateExceptions,
    };

    tasks[t.name] = task;
  });

  return new Graph(tasks, targetTasks.map((t) => t.name));
}
