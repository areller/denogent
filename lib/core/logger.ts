export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LoggerFn = (level: LogLevel, message: string | Error, task?: string, meta?: unknown) => void;

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

/**
 * Creates an instance of the `Logger` interface from a logger function.
 * @param loggerFn a logger function
 * @param task an optional task name
 */
export function createLoggerFromFn(loggerFn: LoggerFn, task?: string): Logger {
    return {
        debug: (message: string, meta?: unknown) => loggerFn('debug', message, task, meta),
        info: (message: string, meta?: unknown) => loggerFn('info', message, task, meta),
        warn: (message: string, meta?: unknown) => loggerFn('warn', message, task, meta),
        error: (message: string | Error, meta?: unknown) => loggerFn('error', message, task, meta)
    };
}