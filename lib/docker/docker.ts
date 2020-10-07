import type { DockerClientBuildArgs, DockerClientArgs, DockerServiceArgs, DockerContainerArgs, DockerClientSubCommandArgs, DockerClientPushArgs } from "./args.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import type { Extension } from "../core/extension.ts";
import { runCommand } from "../../internal/helpers/cmd.ts";

export type Service = { name: string, image: string, ports: number[] };

export class DockerClient {

    private _detectDockerTask: Promise<void>;

    constructor() {
        this._detectDockerTask = new Promise((resolve, reject) => {
            const process = Deno.run({
                cmd: ['docker', '--version'],
                stdout: 'null',
                stderr: 'null'
            });

            process
                .status()
                .then(async status => {
                    if (!status.success) {
                        reject(`Docker wasn't detected.`);
                    }
                    else {
                        resolve();
                    }
                });
        });
    }

    async build(args: DockerClientBuildArgs): Promise<void> {
        let runArgs = ['build'];
        if (args.dockerFile) {
            runArgs.push('-f', args.dockerFile);
        }
        if (args.buildArgs) {
            for (const entry of Object.entries(args.buildArgs)) {
                runArgs.push('--build-arg', entry[0], entry[1]);
            }
        }
        if (args.tag) {
            for (const tag of args.tag instanceof Array ? args.tag : [args.tag]) {
                runArgs.push('-t', tag);
            }
        }

        runArgs.push(args.path ?? '.');

        await this.runDocker(args, runArgs);
    }

    async push(args: DockerClientPushArgs): Promise<void> {
        if (args.credentials !== undefined) {
            let cmd = ['login', '-u', args.credentials.username, '-p', args.credentials.password];
            if (args.credentials.registry !== undefined) {
                cmd.push(args.credentials.registry);
            }
            await this.runDocker(args, cmd, true, true);
        }

        for (const tag of args.tag instanceof Array ? args.tag : [args.tag]) {
            await this.runDocker(args, ['push', tag]);
        }
    }

    /**
     * Runs a docker sub command.
     * @param args sub command arguments
     */
    async subcmd(args: DockerClientSubCommandArgs) {
        let [_, output] = await this.runDocker(args, args.cmd instanceof Array ? args.cmd : args.cmd.split(' '), true);
        return output.trim();
    }

    private async runDocker(args: DockerClientArgs, cmd: string[], throwOnFailure?: boolean, secretArguments?: boolean): Promise<[boolean, string]> {
        await this.detectDocker();
        const path = this.getCwd(args.path);

        const [status, output] = await runCommand(['docker', ...cmd], line => {
            if (args.logger) {
                args.logger.debug(line);
            }
        }, path, false);
        if (!status && (throwOnFailure ?? true)) {
            cmd = (secretArguments ?? false) ? [cmd[0]] : cmd;
            throw new Error(`Unsuccessful response for 'docker ${cmd.join(' ')}'.`);
        }

        return [status, output];
    }

    private async detectDocker(): Promise<void> {
        await this._detectDockerTask;
    }

    private getCwd(cwd?: string): string {
        if (cwd === undefined) {
            return Deno.cwd();
        }

        if (path.isAbsolute(cwd)) {
            return cwd;
        }

        return path.join(Deno.cwd(), cwd);
    }
}

class Docker {

    private _client?: DockerClient;
    private _num: number;

    constructor() {
        this._num = 0;
    }

    service(args: DockerServiceArgs): Extension {
        return {
            name: 'docker-service',
            key: `dokcer-service_${args.name}`,
            enrich: t => {
                let services = t.properties['docker-services'] as { [name: string]: Service };
                if (services === undefined) {
                    services = {};
                    t.properties['docker-services'] = services;
                }

                if (services[args.name]) {
                    throw new Error(`Task '${t.name}' already has a service '${args.name}' in the 'docker-services' property.`);
                }

                services[args.name] = {
                    name: args.name,
                    image: args.image,
                    ports: args.ports ?? []
                };
            }
        };
    }

    container(args: DockerContainerArgs): Extension {
        return {
            name: 'docker-container',
            key: `docker-container_${args.image}`,
            enrich: t => {
                if (t.properties['docker-image']) {
                    throw new Error(`Task '${t.name}' already has a 'docker-image' property.`);
                }

                t.properties['docker-image'] = args.image;
            }
        };
    }

    get client(): DockerClient {
        if (!this._client) {
            this._client = new DockerClient();
        }

        return this._client;
    }
}

const docker = new Docker();
export default docker;