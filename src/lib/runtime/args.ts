import type { Logger } from "../core/logger.ts";

/**
 * Arguments for running a command
 */
export interface CommandArgs {
  /**
   * The absolute or relative path to the working directory.
   * If undefined, defaults to the current working directory
   */
  path?: string;
  /**
   * The command to run
   */
  cmd: string[] | string;
  /**
   * The interface that will be used for logging.
   */
  logger: Logger | undefined | false;
  /**
   * Determines whether an exception should be thrown upon failure. (Default: true)
   */
  throwOnFailure?: boolean;
}
