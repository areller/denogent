import type { DockerClientBuildArgs, DockerClientArgs, DockerServiceArgs } from "./args.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import { readLines } from "../../internal/helpers/reading.ts";
import type { Extension } from "../core/extension.ts";

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
            runArgs.push('-t', args.tag);
        }

        runArgs.push(args.path ?? '.');

        await this.runDocker(args, runArgs);
    }

    private async runDocker(args: DockerClientArgs, cmd: string[], throwOnFailure?: boolean): Promise<[boolean, string]> {
        await this.detectDocker();
        const path = this.getCwd(args?.path);

        const process = Deno.run({ cmd: ['docker', ...cmd], cwd: path, stdout: 'piped', stderr: 'piped' });
        
        await readLines([process.stdout, process.stderr], false, line => {
            if (args.logger) {
                args.logger.debug(line);
            }
        });

        const status = await process.status();
        const output = await process.output();
        await process.stderrOutput();

        if (!status.success) {
            if (throwOnFailure ?? true) {
                throw new Error(`Unsuccessful response for 'docker ${cmd.join(' ')}'.`);
            }

            return [false, ''];
        }

        await process.stderrOutput();
        return [true, new TextDecoder().decode(output)];
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
                const propertyName = `docker-service-prop-${this._num++}`;
                t.property(propertyName, {
                    type: 'docker-service',
                    name: args.name,
                    image: args.image,
                    ports: args.ports ?? []
                });
                t.tag('docker-services', propertyName);
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