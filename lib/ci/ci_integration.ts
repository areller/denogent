import type { LoggerFn } from "../../cli/logger.ts";
import type { Graph } from "../../internal/graph/graph.ts";
import type { Logger } from "../core/logger.ts";

export interface CleanArgs {
    /**
     * an instance of a logger
     */
    logger: Logger;
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
}

export abstract class CIIntegration {
    abstract get type(): string;
    abstract get logFn(): LoggerFn;

    /**
     * Cleans the files of the CI integration.
     * @param args clean arguments
     */
    abstract clean(args: CleanArgs): Promise<void>;

    /**
     * Generates files for the CI integration.
     * @param args generate arguments
     */
    abstract generate(args: GenerateArgs): Promise<void>;
}