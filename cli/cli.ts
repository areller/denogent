import { Args, parseArgs } from "../deps.ts";
import type { CLIContext } from "./context.ts";
import { Command } from "../deps.ts";
import type { Runtime } from "../internal/runtime.ts";
import { LocalRuntime } from "../internal/local_runtime.ts";
import { createGraph, Graph } from "../internal/graph/graph.ts";
import { jsonStreamLog, simpleLog } from "./logger.ts";
import { getRunCommand } from "./run/run.ts";
import { getCLIVersion } from "./version.ts";
import { getTasksCommand } from "./tasks/tasks.ts";
import { stdPath } from "../deps.ts";
import { getCreateCommand } from "./create/create.ts";
import { getGenerateCommand } from "./generate/generate.ts";
import type { BuildContext } from "../lib/core/context.ts";
import type { CIIntegration } from "../lib/ci/ci_integration.ts";

const defaultBuildFile = stdPath.join("build", "build.ts");
const parsedArgs = parseArgs(Deno.args);

function getMainFilePath() {
  const cwd = Deno.cwd();
  return Deno.mainModule.substr(Deno.mainModule.indexOf(cwd) + cwd.length + 1);
}

// run denogent via `deno run {buildFile}`
async function runCLIFromFile(file: string) {
  const process = await Deno.run({
    cmd: ["deno", "run", "-q", "-A", "--unstable", file, ...Deno.args],
    stdout: "inherit",
    stderr: "inherit",
  });
  const status = await process.status();

  Deno.exit(status.code);
}

async function getRuntime(
  args: Args,
  buildContext?: BuildContext,
): Promise<[Runtime, CIIntegration | undefined, Graph | undefined]> {
  const graph = buildContext !== undefined ? createGraph(buildContext.targetTasks) : undefined;
  let runtime: Runtime;
  if (buildContext !== undefined && args["runtime"] && args["runtime"] != "local") {
    const ciArray = buildContext.ciIntegrations.filter((c) => c.type == args["runtime"]);
    if (ciArray === undefined || ciArray.length == 0) {
      throw new Error(`Unknown runtime '${args["runtime"]}'.`);
    }

    runtime = await ciArray[0].createRuntime({
      graph: graph!,
    });

    return [runtime, ciArray[0], graph];
  } else {
    const logger = args["json"] ? jsonStreamLog : simpleLog;
    runtime = new LocalRuntime(graph, args, logger);

    return [runtime, undefined, graph];
  }
}

async function createContext(args: Args, buildFile: string, buildContext?: BuildContext): Promise<CLIContext> {
  const [runtime, ciIntegration, graph] = await getRuntime(args, buildContext);

  return {
    buildContext,
    buildFile,
    args,
    runtime,
    graph,
    ciIntegration,
  };
}

function createCommand(
  buildContext: BuildContext | undefined,
  rawCommand: {
    cmd: Command;
    buildContextRequired: boolean;
    action: (context: CLIContext) => Promise<void>;
  },
): Command {
  return rawCommand.cmd.action(async () => {
    let file = buildContext !== undefined ? getMainFilePath() : (parsedArgs["file"] as string) ?? defaultBuildFile;
    if (rawCommand.buildContextRequired && buildContext === undefined) {
      return await runCLIFromFile(file);
    }

    const context = await createContext(parsedArgs, file, buildContext);

    const actionRes = rawCommand.action(context);
    if (actionRes instanceof Promise) {
      await actionRes;
    }
  });
}

export async function createCLI(buildContext?: BuildContext) {
  const version = getCLIVersion();
  await new Command()
    .name("denogent")
    .version(version == "{{VERSION}}" ? "" : version)
    .description("A TypeScript build system")
    .option("--file [path:string]", "The path to the build file.", {
      global: true,
      default: defaultBuildFile,
    })
    .option("--json [:boolean]", "Emit logs as json.", {
      default: false,
      global: true,
    })
    .option("--runtime [type:string]", "The runtime/CI type.", {
      default: "local",
      global: true,
    })
    .command("create", createCommand(buildContext, getCreateCommand()))
    .command("generate", createCommand(buildContext, getGenerateCommand()))
    .command("run", createCommand(buildContext, getRunCommand()))
    .command("tasks", createCommand(buildContext, getTasksCommand()))
    .parse(Deno.args);
}
