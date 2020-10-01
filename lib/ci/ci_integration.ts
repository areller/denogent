import type { LoggerFn } from "../../cli/logger.ts";
import type { Graph } from "../../internal/graph/graph.ts";
import type { Logger } from "../core/logger.ts";

export abstract class CIIntegration {
    abstract get type(): string;
    abstract get logFn(): LoggerFn;

    /**
     * Cleans the files of the CI integration.
     * @param an instance of a logger
     */
    abstract clean(logger: Logger): Promise<void>;

    /**
     * Generates files for the CI integration.
     * @param buildFile the path to the build file
     * @param graph the graph object
     * @param logger an instance of a logger
     */
    abstract generate(buildFile: string, graph: Graph, logger: Logger): Promise<void>;
}