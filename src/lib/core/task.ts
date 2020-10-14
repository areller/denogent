import type { TaskContext } from "./context.ts";
import type { Extension } from "./extension.ts";

export type ExecFn = (context?: TaskContext) => Promise<void> | void;
export type CondFn = (context?: TaskContext) => Promise<boolean> | boolean;

/**
 * A task represents a unit of work, that may depend or may trigger other tasks.
 */
export class Task {
  private _exec?: ExecFn;
  private _dependencies: Task[];
  private _dependents: Task[];
  private _conditions: CondFn[];
  private _tags: { [name: string]: string[] };
  private _properties: { [name: string]: unknown };
  private _extensions: { [key: string]: Extension };
  private _propagateExceptions: boolean;

  constructor(private _name: string) {
    this._dependencies = [];
    this._dependents = [];
    this._conditions = [];
    this._tags = {};
    this._properties = {};
    this._extensions = {};
    this._propagateExceptions = true;
  }

  /**
   * Defines a dependency or an array of dependencies, that the current task depends on.
   * @param dependencies a single dependency or an array or dependencies. (a dependency can either be another task or an extension)
   */
  public dependsOn(dependencies: Task | Task[] | Extension | Extension[]): Task {
    if (dependencies instanceof Array) {
      for (const dependency of dependencies) {
        this.dependsOn(dependency);
      }
    } else if (dependencies instanceof Task) {
      dependencies._dependents.push(this);
      this._dependencies.push(dependencies);
    } else if ((dependencies as Extension).enrich !== undefined) {
      if (this._extensions[dependencies.key] !== undefined) {
        throw new Error(`Task '${this.name}' already depends on extension with key '${dependencies.key}'.`);
      }

      dependencies.enrich(this);
      this._extensions[dependencies.key] = dependencies;
    }

    return this;
  }

  /**
   * Defines a task or an array of task, that would be triggered by the current task's completion.
   * @param tasks a single task or an array of tasks
   */
  public triggers(tasks: Task | Task[]): Task {
    if (tasks instanceof Array) {
      for (let task of tasks) {
        task._dependencies.push(this);
        this._dependents.push(task);
      }
    } else {
      tasks._dependencies.push(this);
      this._dependents.push(tasks);
    }

    return this;
  }

  /**
   * Defines a condition for the current task to run.
   * @param cond a condition for the current task to run
   */
  public when(cond: CondFn): Task {
    this._conditions.push(cond);
    return this;
  }

  /**
   * Defines the function that the current task would executes.
   * @param exec the function that the current task executes
   */
  public does(exec: ExecFn): Task {
    this._exec = exec;
    return this;
  }

  /**
   * Adds a tag to the current task.
   * @param name the name of the tag
   * @param value the value of the tag
   */
  public tag(name: string, value: string | string[]): Task {
    if (!this._tags[name]) {
      this._tags[name] = value instanceof Array ? value : [value];
    } else {
      if (value instanceof Array) {
        this._tags[name].push(...value);
      } else {
        this._tags[name].push(value);
      }
    }
    return this;
  }

  /**
   * Assigns a property to the current task.
   * @param name the name of the property
   * @param value the value of the property
   */
  public property(name: string, value: unknown): Task {
    this._properties[name] = value;
    return this;
  }

  /**
   * Sets whether or not the task should propagate its exception upon failure.
   * @param breakCircuit if true, the task won't propagate its exception in case of a failure. (default = true)
   */
  public breakCircuit(breakCircuit?: boolean): Task {
    this._propagateExceptions = !(breakCircuit ?? true);
    return this;
  }

  /**
   * Gets an array of tasks that the current task depends on.
   */
  public get dependencies(): Task[] {
    return this._dependencies;
  }

  /**
   * Gets an array of tasks that depend on the current task.
   */
  public get dependents(): Task[] {
    return this._dependents;
  }

  /**
   * Gets an array of conditions that have to met before the current task is able to run.
   */
  public get conditions(): CondFn[] {
    return this._conditions;
  }

  /**
   * Gets the function that the current task executes.
   */
  public get exec(): ExecFn | undefined {
    return this._exec;
  }

  /**
   * Gets whether or not the task should propagate its own exception upon failure.
   */
  public get propagateExceptions(): boolean {
    return this._propagateExceptions;
  }

  /**
   * Gets the name of the current task.
   */
  public get name(): string {
    return this._name;
  }

  /**
   * Gets the tags of the current task.
   */
  public get tags(): { [name: string]: string[] } {
    return this._tags;
  }

  /**
   * Gets the properties of the current task.
   */
  public get properties(): { [name: string]: unknown } {
    return this._properties;
  }

  /**
   * Gets an array of extensions that the current task depends on.
   */
  public get extensions(): Extension[] {
    return Object.values(this._extensions);
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
