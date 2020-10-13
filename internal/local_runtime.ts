import { Args, uuidv4 } from '../deps.ts';
import type { LoggerFn } from '../lib/core/logger.ts';
import type { Service } from '../lib/docker/docker.ts';
import type { Graph } from './graph/graph.ts';
import { runCommand } from './helpers/cmd.ts';
import type { Runtime } from './runtime.ts';

export class LocalRuntime implements Runtime {
	private containerNames: string[];

	private _bootTasks: {
		pre: () => Promise<void>;
		post: () => Promise<void>;
		skipFlag: string;
	}[] = [
		{
			pre: this.launchDockerServices,
			post: this.removeDockerServices,
			skipFlag: 'skip-services',
		},
	];

	constructor(private graph: Graph | undefined, private args: Args, private logger: LoggerFn) {
		this.containerNames = [];
	}

	get loggerFn(): LoggerFn {
		return this.logger;
	}

	async beforeExecution(): Promise<void> {
		if (this.graph === undefined) {
			return;
		}

		for (const bootTask of this._bootTasks) {
			if (this.args[bootTask.skipFlag]) {
				continue;
			}

			await bootTask.pre.bind(this)();
		}
	}

	async afterExecution(): Promise<void> {
		if (this.graph === undefined) {
			return;
		}

		for (const bootTask of this._bootTasks.reverse()) {
			if (this.args[bootTask.skipFlag]) {
				continue;
			}

			await bootTask.post.bind(this)();
		}
	}

	async launchDockerServices(): Promise<void> {
		let services: { [name: string]: Service } = {};
		for (const taskName of this.graph!.taskNames) {
			const task = this.graph!.getTask(taskName)!;
			const dockerServices = task.properties['docker-services'] as { [name: string]: Service } | undefined;

			if (dockerServices !== undefined) {
				for (const dockerService of Object.values(dockerServices)) {
					services[dockerService.name] = dockerService;
				}
			}
		}

		if (Object.keys(services).length == 0) {
			return;
		}

		if (!(await runCommand(['docker', '--version'], undefined, undefined, false))[0]) {
			throw new Error(`Docker is not installed.`);
		}

		for (const service of Object.values(services)) {
			const id = uuidv4.generate().replaceAll('-', '');
			let cmd = ['docker', 'run', '--rm', '--name', id, '-idt'];
			for (const port of service.ports) {
				cmd.push('-p', `${port}:${port}`);
			}

			cmd.push(service.image);

			await runCommand(cmd, line => {
				this.loggerFn('debug', line);
			});

			this.containerNames.push(id);

			Deno.env.set(`${service.name.toUpperCase()}_HOST`, 'localhost');
			if (service.ports.length > 0) {
				Deno.env.set(`${service.name.toUpperCase()}_PORT`, service.ports[0].toString());
				Deno.env.set(`${service.name.toUpperCase()}_PORTS`, service.ports.join(';'));
			}
		}
	}

	async removeDockerServices(): Promise<void> {
		if (this.containerNames.length == 0) {
			return;
		}

		for (const name of this.containerNames) {
			await runCommand(['docker', 'rm', '-f', name]);
		}
	}
}
