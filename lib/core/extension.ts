import type { Task } from "./task.ts";

export interface Extension {

    name: string;
    enrich(task: Task): void;
}