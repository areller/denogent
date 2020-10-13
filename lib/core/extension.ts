import type { Task } from './task.ts';

export interface Extension {
	name: string;
	key: string;
	enrich(task: Task): void;
}
