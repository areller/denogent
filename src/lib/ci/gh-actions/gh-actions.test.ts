import { emptyTempDir, mockDebugLogger } from "../../../internal/testing/helpers.ts";
import { describe } from "../../../internal/testing/test.ts";
import { GitHubActions } from "./gh-actions.ts";
import { createGraph, Graph } from "../../../internal/graph/graph.ts";
import { task } from "../../core/task.ts";
import { parseYaml, stdFs, stdPath } from "../../../../deps.ts";
import { assertEquals } from "../../../../tests_deps.ts";
import { pathJoin } from "../../../internal/helpers/env.ts";

describe("gh-actions.test.ts", (t) => {
  t.test("clean should clean workflow file", async () => {
    await emptyTempDir(async (temp) => {
      const workflowsPath = stdPath.join(temp, ".github", "workflows");
      await stdFs.ensureDir(workflowsPath);
      const workflowFile = stdPath.join(workflowsPath, "workflow.yaml");
      await stdFs.ensureFile(workflowFile);

      assertEquals(await stdFs.exists(workflowFile), true);

      const ghActions = new GitHubActions("some-image");
      await ghActions.clean({ path: temp, logger: mockDebugLogger() });

      assertEquals(await stdFs.exists(workflowFile), false);
    });
  });

  ["unknown-image", "ubuntu-latest", "windows-latest"].forEach((image) => {
    t.test("generate should generate a workflow file", async () => {
      await workflowAssertTest(
        new GitHubActions(image),
        createSimpleGraph(),
        image,
        {
          push: {
            branches: ["master"],
          },
        },
        [],
        undefined,
        undefined,
      );
    });
  });

  t.test("generate should generate workflow file (branches)", async () => {
    await workflowAssertTest(
      new GitHubActions("ubuntu-latest", undefined, ["master", "dev"], ["master"], ["v*"]),
      createSimpleGraph(),
      "ubuntu-latest",
      {
        push: {
          branches: ["master", "dev"],
          tags: ["v*"],
        },
        pull_request: {
          branches: ["master"],
        },
      },
      [],
      undefined,
      undefined,
    );
  });

  t.test("generate should generate a workflow file (secrets)", async () => {
    await workflowAssertTest(
      new GitHubActions("ubuntu-latest"),
      createGraphWithSecrets(),
      "ubuntu-latest",
      {
        push: {
          branches: ["master"],
        },
      },
      [],
      undefined,
      {
        token: "${{ secrets.token }}",
        username: "${{ secrets.username }}",
        password: "${{ secrets.password }}",
      },
    );
  });

  t.test("generate should generate a workflow file (uses)", async () => {
    await workflowAssertTest(
      new GitHubActions("ubuntu-latest"),
      createGraphWithUses(),
      "ubuntu-latest",
      {
        push: {
          branches: ["master"],
        },
      },
      [
        {
          name: "nodejs",
          uses: "nodejs/nodejs",
          with: {
            "node-version": "12.18",
          },
        },
        {
          name: "dotnet",
          uses: "dotnet/dotnet",
          with: {
            "dotnet-version": "5.0",
          },
        },
      ],
      undefined,
      undefined,
    );
  });

  t.test("generate should generate a workflow file (services)", async () => {
    await workflowAssertTest(
      new GitHubActions("ubuntu-latest"),
      createGraphWithServices(),
      "ubuntu-latest",
      {
        push: {
          branches: ["master"],
        },
      },
      [],
      {
        serviceA: {
          image: "serviceA:0.1",
          ports: ["8080:8080"],
        },
        serviceB: {
          image: "serviceB:0.1",
          ports: ["8081:8081", "8082:8082"],
        },
      },
      {
        SERVICEA_HOST: "localhost",
        SERVICEA_PORT: "8080",
        SERVICEA_PORTS: "8080",
        SERVICEB_HOST: "localhost",
        SERVICEB_PORT: "8081",
        SERVICEB_PORTS: "8081;8082",
      },
    );
  });
});

function createSimpleGraph(): Graph {
  const a = task("a");
  const b = task("b").dependsOn(a);

  return createGraph([b]);
}

function createGraphWithSecrets(): Graph {
  const a = task("a").property("secrets", ["username", "password"]);
  const b = task("b").dependsOn(a).property("secrets", ["username", "token"]);

  return createGraph([b]);
}

function createGraphWithUses(): Graph {
  const nodeJsUse = {
    name: "nodejs",
    uses: "nodejs/nodejs",
    with: {
      "node-version": "12.18",
    },
  };
  const dotnetUse = {
    name: "dotnet",
    uses: "dotnet/dotnet",
    with: {
      "dotnet-version": "5.0",
    },
  };

  const a = task("a").property("gh-actions-uses", {
    ["nodejs"]: nodeJsUse,
  });
  const b = task("b")
    .dependsOn(a)
    .property("gh-actions-uses", {
      ["nodejs"]: nodeJsUse,
      ["dotnet"]: dotnetUse,
    });

  return createGraph([b]);
}

function createGraphWithServices(): Graph {
  const serviceA = {
    name: "serviceA",
    image: "serviceA:0.1",
    ports: [8080],
  };
  const serviceB = {
    name: "serviceB",
    image: "serviceB:0.1",
    ports: [8081, 8082],
  };

  const a = task("a").property("docker-services", {
    ["serviceA"]: serviceA,
  });
  const b = task("b")
    .dependsOn(a)
    .property("docker-services", {
      ["serviceA"]: serviceA,
      ["serviceB"]: serviceB,
    });

  return createGraph([b]);
}

async function workflowAssertTest(
  ghActions: GitHubActions,
  graph: Graph,
  image: string,
  triggers: unknown,
  extraSteps: unknown[],
  services: unknown,
  env: unknown,
) {
  await emptyTempDir(async (temp) => {
    await ghActions.generate({
      name: "build",
      buildFile: stdPath.join("build", "some-build.ts"),
      graph,
      logger: mockDebugLogger(),
      path: temp,
    });

    const workflowFile = stdPath.join(temp, ".github", "workflows", "build.yml");
    assertEquals(await stdFs.exists(workflowFile), true);

    const buildFilePath = image.startsWith("windows")
      ? pathJoin(["build", "some-build.ts"], "win")
      : pathJoin(["build", "some-build.ts"], "unix");

    const runStep = {
      name: "run build",
      run: `deno run -A -q --unstable ${buildFilePath} run --serial --runtime gh-actions`,
      env,
    };

    if (env === undefined) {
      delete runStep["env"];
    }

    const workflow = {
      name: "build",
      on: triggers,
      jobs: {
        [image]: {
          name: image,
          "runs-on": image,
          services,
          steps: [
            {
              name: "checkout",
              uses: "actions/checkout@v2",
            },
            {
              name: "setup deno",
              uses: "denolib/setup-deno@v2",
              with: {
                "deno-version": `v${Deno.version.deno}`,
              },
            },
            ...extraSteps,
            runStep,
          ],
        },
      },
    };

    if (services === undefined) {
      delete workflow["jobs"][image]["services"];
    }

    const workflowFromFile = (await readWorkflowFile(workflowFile)) as typeof workflow;

    assertEquals(workflowFromFile, workflow);
  });
}

async function readWorkflowFile(file: string): Promise<unknown> {
  const contents = new TextDecoder().decode(await Deno.readFile(file));
  return parseYaml(contents);
}
