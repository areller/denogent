import type { LoggerFn } from "../../cli/logger.ts";
import type { Graph } from "../../internal/graph/graph.ts";
import type { Logger } from "../core/logger.ts";

export interface CleanArgs {
    /**
     * an instance of a logger
     */
    logger: Logger;
    /**
     * The absolute or relative path to the project directory. 
     * If undefined, defaults to working directory.
     */
    path?: string;
}

export interface GenerateArgs {
    /**
     * the name of the build
     */
    name: string;
    /**
     * the path to the build file
     */
    buildFile: string;
    /**
     * the graph object
     */
    graph: Graph;
    /**
     * an instance of a logger
     */
    logger: Logger;
    /**
     * The absolute or relative path to the project directory. 
     * If undefined, defaults to working directory.
     */
    path?: string;
}

export interface CIIntegration {
    type: string;
    logFn: LoggerFn;

    /**
     * Cleans the files of the CI integration.
     * @param args clean arguments
     */
    clean(args: CleanArgs): Promise<void>;

    /**
     * Generates files for the CI integration.
     * @param args generate arguments
     */
    generate(args: GenerateArgs): Promise<void>;
}