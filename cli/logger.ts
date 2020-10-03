import * as Colors from 'https://deno.land/std@0.71.0/fmt/colors.ts';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LoggerFn = (level: LogLevel, message: string | Error, task?: string, meta?: unknown) => void;

export function simpleLog(level: LogLevel, message: string | Error, task?: string, meta?: unknown) {
    const prefix = task !== undefined ? `[${task}] ` : '';
    // deno-lint-ignore no-explicit-any
    const suffix = meta !== undefined ? ' {' + Object.entries(meta as any).map(x => ` ${x[0]} = ${x[1]}`) + ' }' : '';

    switch (level) {
        case 'debug':
            console.log(Colors.gray(`[DBG] ${prefix}${message}${suffix}`));
            break;
        case 'info':
            console.log(Colors.white(`[INFO] ${prefix}${message}${suffix}`));
            break;
        case 'warn':
            console.log(Colors.yellow(`[WARN] ${prefix}${message}${suffix}`));
            break;
        case 'error':
            console.error(Colors.red(`[ERR] ${prefix}${message}${suffix}`));
            if (message instanceof Error) {
                console.error(Colors.red(message.stack?.toString() ?? ''));
            }
            break;
    }
}

function createJSON(level: LogLevel, message: string | Error, task?: string, meta?: unknown): unknown {
    return {
        log: {
            level,
            message: typeof message == 'string' ? message : message.message,
            stack: typeof message == 'string' ? undefined : message.stack
        },
        task,
        // deno-lint-ignore no-explicit-any
        ...((meta || {}) as any)
    };
}

export function jsonStreamLog(level: LogLevel, message: string | Error, task?: string, meta?: unknown) {
    console.log(JSON.stringify(createJSON(level, message, task, meta)));
}

let buffer: unknown[] | undefined = undefined;

export function jsonLog(level: LogLevel, message: string | Error, task?: string, meta?: unknown) {
    if (buffer === undefined) {
        buffer = [];
    }

    buffer.push(createJSON(level, message, task, meta));
}

export function jsonLogCleanBuffer() {
    if (buffer !== undefined) {
        console.log(JSON.stringify(buffer));
    }
}