import type { CLICommand } from "./cli.ts";
import { createCommandDescription } from "./create/create.ts";
import { generateCommandDescription } from "./generate/generate.ts";
import { runCommandDescription } from "./run/run.ts";
import { tasksCommandDescription } from "./tasks/tasks.ts";

let commands: CLICommand[] = [];

function addCommand(command: CLICommand) {
    commands.push(command);
}

export function initializeCommands() {
    addCommand(createCommandDescription());
    addCommand(runCommandDescription());
    addCommand(generateCommandDescription());
    addCommand(tasksCommandDescription());
}

export function showHelp(): void {
    console.log('help');
}

export function getCommand(name: string): CLICommand | undefined {
    const cmd = commands.filter(x => x.name == name);
    if (cmd.length == 0) {
        return undefined;
    }

    return cmd[0];
}