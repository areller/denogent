import type { Logger } from "../core/logger.ts";

/**
 * Common arguments for all docker client commands
 */
export interface DockerClientArgs {
    /**
     * The absolute or relative path to the repository. 
     * If undefined, defaults to working directory.
     */
    path?: string;
    /**
     * The interface that will be used for logging
     */
    logger: Logger | undefined | false;
}

/**
 * Command arguments for the docker build command
 */
export interface DockerClientBuildArgs extends DockerClientArgs {
    /**
     * The path to the docker file
     */
    dockerFile?: string;
    /**
     * Build arguments
     */
    buildArgs?: { [name: string]: string };
    /**
     * An optional tag or list of tags for the built image
     */
    tag?: string | string[];
}

/**
 * Command arguments for the docker push command
 */
export interface DockerClientPushArgs extends DockerClientArgs {
    /**
     * The tag or list of tags to push
     */
    tag: string | string[];
    /**
     * Credentials to the registry
     */
    credentials?: DockerRegistryCredentials;
}

/**
 * Credentials to login to a docker registry
 */
export interface DockerRegistryCredentials {
    /**
     * Username
     */
    username: string;
    /**
     * Password
     */
    password: string;
    /**
     * URL of a remote registry. (Default: docker.io)
     */
    registry?: string;
}

/**
 * Command arguments for docker subcommand
 */
export interface DockerClientSubCommandArgs extends DockerClientArgs {
    /**
     * The subcommand to run
     */
    cmd: string | string[];
}

export interface DockerServiceArgs {
    name: string;
    image: string;
    ports?: number[];
}

export interface DockerContainerArgs {
    image: string;
}