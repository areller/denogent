/**
 * Use this logger to log messages from inside a task.
 */
export interface Logger {
    /**
     * Log a 'DEBUG' level message.
     * @param message the message
     * @param meta meta data attached to the message
     */
    debug(message: string, meta?: unknown): void;

    /**
     * Log a 'INFO' level message.
     * @param message the message
     * @param meta meta data attached to the message
     */
    info(message: string, meta?: unknown): void;

    /**
     * Log a 'WARN' level message.
     * @param message the message
     * @param meta meta data attached to the message
     */
    warn(message: string, meta?: unknown): void;

    /**
     * Log a 'ERROR' level message.
     * @param message the message
     * @param meta meta data attached to the message
     */
    error(message: string, meta?: unknown): void;

    /**
     * Log a 'ERROR' level message from an error object.
     * @param err the error object
     * @param meta meta data attached to the message
     */
    error(err: Error, meta?: unknown): void;
}