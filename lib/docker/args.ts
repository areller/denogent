import type { Logger } from "../core/logger.ts";

export interface DockerClientArgs {
    path?: string;
    logger: Logger | undefined | false;
}

export interface DockerClientBuildArgs extends DockerClientArgs {
    dockerFile?: string;
    buildArgs?: { [name: string]: string };
    tag?: string;
}

export interface DockerServiceArgs {
    name: string;
    image: string;
    ports?: string[];
}