import { config } from 'https://deno.land/x/dotenv/mod.ts';
import { parse } from "https://deno.land/std@0.70.0/flags/mod.ts";

config();
const args = parse(Deno.args);

/**
 * Gets an environment variable.
 * @param name the name of the environment variable.
 */
export function env(name: string): string | undefined {
    return Deno.env.get(name);
}

/**
 * Gets the values of an argument.
 * @param name the name of the argument.
 */
export function argArray(name: string): string[] {
    const arg = args[name];
    if (!arg) {
        return [];
    }

    if (arg instanceof Array) {
        return arg.map(a => a.toString());
    }
    else {
        return [arg.toString()];
    }
}

/**
 * Gets the value of an argument.
 * @param name the name of the argument.
 */
export function arg(name: string): string | undefined {
    let args = argArray(name);
    if (args.length == 0) {
        return undefined;
    }

    return args[0];
}

/**
 * Gets the value of the argument, or an equivalent environment variable if there is no such argument.
 * @param name the name of the argument or environment variable.
 */
export function argOrEnv(name: string): string | undefined {
    for (const fn of [arg, env]) {
        const res = fn(name);
        if (res !== undefined) {
            return res;
        }
    }

    return undefined;
}