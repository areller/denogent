import { Args, parse } from "https://deno.land/std@0.70.0/flags/mod.ts";
import { getCommand, initializeCommands, showHelp } from "./commands.ts";
import type { BuildContext, CLIContext } from "./context.ts";
import { jsonLog, jsonLogCleanBuffer, jsonStreamLog, LoggerFn, simpleLog } from "./logger.ts";

export enum CLICommandOptionDataType {
    Boolean = 0,
    Number = 1 << 0,
    String = 1 << 1,
    StringArray = 1 << 2
}

export const fileOption: CLICommandOption = {
    name: 'file',
    description: 'The path to the build file',
    dataType: CLICommandOptionDataType.String,
    required: true
};

export const optionalFileOption: CLICommandOption = {
    name: 'file',
    description: 'The path to the build file',
    dataType: CLICommandOptionDataType.String,
    required: false
};

export interface CLICommandOption {
    name: string;
    description: string;
    dataType: CLICommandOptionDataType;
    required: boolean;
}

export interface CLICommand {
    name: string;
    description: string;
    options: CLICommandOption[];
    requireBuildContext: boolean;
    fn: (context: CLIContext) => Promise<void>
}

export interface CreateCLIArgs {
    /**
     * The context for the CLI.
     */
    context?: BuildContext;
}

async function runCLIViaDenoRun(cliArgs: Args): Promise<void> {
    if (!cliArgs.file) {
        return console.error(`Option '--file' is required but wasn't provided.`);
    }

    const process = await Deno.run({
        cmd: ['deno', 'run', '-q', '-A', '--unstable', cliArgs.file, ...Deno.args],
        stdout: 'inherit',
        stderr: 'inherit'
    });
    const status = await process.status();

    Deno.exit(status.code);
}

function decideLogger(cliArgs: Args, buildContext: BuildContext): LoggerFn | undefined {
    if (cliArgs['json-stream']) {
        return jsonStreamLog;
    }
    else if (cliArgs['json']) {
        return jsonLog;
    }
    else if (cliArgs['ci-runtime']) {
        const ciArray = buildContext.ciIntegrations.filter(c => c.type == cliArgs['ci-runtime']);
        if (ciArray === undefined || ciArray.length == 0) {
            return undefined;
        }

        const ci = ciArray[0];

        return ci.logFn;
    }

    return simpleLog;
}

// gets the {path} in `deno run {path}`
function getMainFilePath() {
    const cwd = Deno.cwd();
    return Deno.mainModule.substr(Deno.mainModule.indexOf(cwd) + cwd.length + 1);
}

export async function createCLI(args: CreateCLIArgs): Promise<void> {
    initializeCommands();

    const cliArgs = parse(Deno.args);
    if (cliArgs._.length == 0) {
        return showHelp();
    }

    const cmd = getCommand(cliArgs._[0].toString());
    if (cmd === undefined) {
        return simpleLog('error', `Command '${cliArgs._[0]}' was not found.`);
    }

    if (cmd.requireBuildContext && cmd.options.filter(opt => opt == fileOption).length > 0) {
        if (args.context === undefined) {
            return await runCLIViaDenoRun(cliArgs);
        }
        else {
            cliArgs.file = getMainFilePath();
        }
    }

    const logger = decideLogger(cliArgs, args.context!);
    if (logger === undefined) {
        return simpleLog('error', 'Unable to choose a logger');
    }

    try {
        await cmd.fn({
            buildContext: args.context,
            args: cliArgs,
            logger
        });
    }
    catch (err) {
        logger('error', err);
        Deno.exit(1);
    }
    finally {
        jsonLogCleanBuffer();
    }
}