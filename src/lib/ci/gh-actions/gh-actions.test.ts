import { parseYaml, stdFs, stdPath } from "../../../../deps.ts";
import { emptyTempDir, mockDebugLogger } from "../../../internal/testing/helpers.ts";
import { describe } from "../../../internal/testing/test.ts";
import { assertEquals, assertNotEquals } from "../../../../tests_deps.ts";
import { createGitHubActions, CreateGitHubActionsArgs, GitHubActions } from "./gh-actions.ts";
import { createGraph, Graph } from "../../../internal/graph/graph.ts";
import { pathJoin } from "../../../internal/helpers/env.ts";
import { task } from "../../core/task.ts";

const simpleTrigger = {
  push: {
    branches: ["master"],
  },
};

describe("gh-actions.test.ts", (t) => {
  t.test("clean should clean workflow file", async () => {
    await emptyTempDir(async (temp) => {
      const workflowsPath = stdPath.join(temp, ".github", "workflows");
      await stdFs.ensureDir(workflowsPath);
      const workflowFile = stdPath.join(workflowsPath, "workflow.yaml");
      await stdFs.ensureFile(workflowFile);

      assertEquals(await stdFs.exists(workflowFile), true);

      const ghActions = createGitHubActions({ image: "some-image" });
      await ghActions.clean({ path: temp, logger: mockDebugLogger() });

      assertEquals(await stdFs.exists(workflowFile), false);
    });
  });

  t.test("should fail to generate multiple jobs without names", async () => {
    let error: Error | undefined = undefined;
    try {
      createGHActions({ jobs: [{ image: "windows-latest" }, { name: "job", image: "ubuntu-latest" }] });
    } catch (err) {
      error = err;
    }

    assertNotEquals(error, undefined);
  });

  t.test("should fail to generate multiple jobs with duplicate names", async () => {
    let error: Error | undefined = undefined;
    try {
      createGHActions({
        jobs: [
          { name: "jobA", image: "windows-latest" },
          { name: "jobA", image: "ubuntu-latest" },
        ],
      });
    } catch (err) {
      error = err;
    }

    assertNotEquals(error, undefined);
  });

  ["unknown-image", "ubuntu-latest", "windows-latest"].forEach((image) => {
    t.test(`should generate single job workflow of image = ${image}`, async () => {
      await workflowAssertTest(
        createGHActions({ image }),
        createSimpleGraph(),
        [{ name: "build", image }],
        simpleTrigger,
      );
    });
  });

  t.test("should generate workflow file with multiple jobs", async () => {
    await workflowAssertTest(
      createGHActions({
        jobs: [
          { name: "jobA", image: "windows-latest" },
          { name: "jobB", image: "ubuntu-latest" },
        ],
      }),
      createSimpleGraph(),
      [
        { name: "jobA", image: "windows-latest" },
        { name: "jobB", image: "ubuntu-latest" },
      ],
      simpleTrigger,
    );
  });

  t.test("should generate workflow file with branches", async () => {
    await workflowAssertTest(
      createGHActions({
        image: "ubuntu-latest",
        onPushBranches: ["master", "release"],
        onPRBranches: ["master", "release", "dev"],
        onPushTags: ["v*"],
      }),
      createSimpleGraph(),
      [{ name: "build", image: "ubuntu-latest" }],
      {
        push: {
          branches: ["master", "release"],
          tags: ["v*"],
        },
        pull_request: {
          branches: ["master", "release", "dev"],
        },
      },
    );
  });

  t.test("should generate workflow file with environment variables", async () => {
    await workflowAssertTest(
      createGHActions({
        jobs: [
          { name: "jobA", image: "ubuntu-latest", env: { envA: "a", envB: "b" } },
          { name: "jobB", image: "ubuntu-latest", env: { envC: "c", envD: "d" } },
        ],
      }),
      createSimpleGraph(),
      [
        { name: "jobA", image: "ubuntu-latest", env: { envA: "a", envB: "b" } },
        { name: "jobB", image: "ubuntu-latest", env: { envC: "c", envD: "d" } },
      ],
      simpleTrigger,
    );
  });

  t.test("should generate workflow file with selective tasks", async () => {
    await workflowAssertTest(
      createGHActions({
        jobs: [
          { name: "jobA", image: "ubuntu-latest", onlyTasks: [task("taskA"), task("taskB")] },
          { name: "jobB", image: "ubuntu-latest", onlyTasks: [task("taskC")] },
        ],
      }),
      createGraph([task("taskA"), task("taskB"), task("taskC")]),
      [
        { name: "jobA", image: "ubuntu-latest", onlyTasks: ["taskA", "taskB"] },
        { name: "jobB", image: "ubuntu-latest", onlyTasks: ["taskC"] },
      ],
      simpleTrigger,
    );
  });

  t.test("should generate workflow file with secrets (single job)", async () => {
    await workflowAssertTest(
      createGHActions({ image: "ubuntu-latest" }),
      createGraphWithSecrets(),
      [
        {
          name: "build",
          image: "ubuntu-latest",
          env: {
            token: "${{ secrets.token }}",
            username: "${{ secrets.username }}",
            password: "${{ secrets.password }}",
          },
        },
      ],
      simpleTrigger,
    );
  });

  t.test("should generate workflow file with secrets (multiple jobs)", async () => {
    await workflowAssertTest(
      createGHActions({
        jobs: [
          { name: "jobA", image: "ubuntu-latest", onlyTasks: [task("a")], env: { customA: "a" } },
          { name: "jobB", image: "ubuntu-latest", onlyTasks: [task("b")] },
        ],
      }),
      createGraphWithSecrets(),
      [
        {
          name: "jobA",
          image: "ubuntu-latest",
          onlyTasks: ["a"],
          env: {
            username: "${{ secrets.username }}",
            password: "${{ secrets.password }}",
            customA: "a",
          },
        },
        {
          name: "jobB",
          image: "ubuntu-latest",
          onlyTasks: ["b"],
          env: {
            username: "${{ secrets.username }}",
            token: "${{ secrets.token }}",
          },
        },
      ],
      simpleTrigger,
    );
  });

  t.test("should generate workflow file with uses (single job)", async () => {
    await workflowAssertTest(
      createGHActions({ image: "ubuntu-latest" }),
      createGraphWithUses(),
      [
        {
          name: "build",
          image: "ubuntu-latest",
          extraSteps: [
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
        },
      ],
      simpleTrigger,
    );
  });

  t.test("should generate workflow file with uses (multiple jobs)", async () => {
    await workflowAssertTest(
      createGHActions({
        jobs: [
          { name: "jobA", image: "ubuntu-latest", onlyTasks: [task("a")] },
          { name: "jobB", image: "ubuntu-latest", onlyTasks: [task("b")] },
        ],
      }),
      createGraphWithUses(),
      [
        {
          name: "jobA",
          image: "ubuntu-latest",
          onlyTasks: ["a"],
          extraSteps: [
            {
              name: "nodejs",
              uses: "nodejs/nodejs",
              with: {
                "node-version": "12.18",
              },
            },
          ],
        },
        {
          name: "jobB",
          image: "ubuntu-latest",
          onlyTasks: ["b"],
          extraSteps: [
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
        },
      ],
      simpleTrigger,
    );
  });

  t.test("should generate workflow file with services (single job)", async () => {
    await workflowAssertTest(
      createGHActions({ image: "ubuntu-latest" }),
      createGraphWithServices(),
      [
        {
          name: "build",
          image: "ubuntu-latest",
          services: {
            serviceA: {
              image: "serviceA:0.1",
              ports: ["8080:8080"],
            },
            serviceB: {
              image: "serviceB:0.1",
              ports: ["8081:8081", "8082:8082"],
            },
          },
          env: {
            SERVICEA_HOST: "localhost",
            SERVICEA_PORT: "8080",
            SERVICEA_PORTS: "8080",
            SERVICEB_HOST: "localhost",
            SERVICEB_PORT: "8081",
            SERVICEB_PORTS: "8081;8082",
          },
        },
      ],
      simpleTrigger,
    );
  });

  t.test("should generate workflow file with services (multiple jobs)", async () => {
    await workflowAssertTest(
      createGHActions({
        jobs: [
          { name: "jobA", image: "ubuntu-latest", onlyTasks: [task("a")], env: { customA: "a" } },
          { name: "jobB", image: "ubuntu-latest", onlyTasks: [task("b")] },
        ],
      }),
      createGraphWithServices(),
      [
        {
          name: "jobA",
          image: "ubuntu-latest",
          onlyTasks: ["a"],
          services: {
            serviceA: {
              image: "serviceA:0.1",
              ports: ["8080:8080"],
            },
          },
          env: {
            SERVICEA_HOST: "localhost",
            SERVICEA_PORT: "8080",
            SERVICEA_PORTS: "8080",
            customA: "a",
          },
        },
        {
          name: "jobB",
          image: "ubuntu-latest",
          onlyTasks: ["b"],
          services: {
            serviceA: {
              image: "serviceA:0.1",
              ports: ["8080:8080"],
            },
            serviceB: {
              image: "serviceB:0.1",
              ports: ["8081:8081", "8082:8082"],
            },
          },
          env: {
            SERVICEA_HOST: "localhost",
            SERVICEA_PORT: "8080",
            SERVICEA_PORTS: "8080",
            SERVICEB_HOST: "localhost",
            SERVICEB_PORT: "8081",
            SERVICEB_PORTS: "8081;8082",
          },
        },
      ],
      simpleTrigger,
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
  jobs: {
    name: string;
    image: string;
    onlyTasks?: string[];
    extraSteps?: unknown[];
    services?: unknown;
    env?: unknown;
  }[],
  triggers: unknown,
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

    const workflowJobs: { [name: string]: unknown } = {};
    for (const job of jobs) {
      const buildFilePath = job.image.startsWith("windows")
        ? pathJoin(["build", "some-build.ts"], "win")
        : pathJoin(["build", "some-build.ts"], "unix");

      const runCmd = [
        "deno",
        "run",
        "-A",
        "-q",
        "--unstable",
        buildFilePath,
        "run",
        "--runtime",
        "gh-actions",
        "--serial",
      ];
      if (job.onlyTasks !== undefined) {
        for (const task of job.onlyTasks) {
          runCmd.push("--only", task);
        }
      }

      const runStep = {
        name: "run build",
        run: runCmd.join(" "),
        env: job.env,
      };

      if (job.env === undefined) {
        delete runStep["env"];
      }

      const workflowJob = {
        name: job.name,
        "runs-on": job.image,
        services: job.services,
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
          ...(job.extraSteps ?? []),
          runStep,
        ],
      };

      if (job.services === undefined) {
        delete workflowJob["services"];
      }

      workflowJobs[job.name] = workflowJob;
    }

    const workflow = {
      name: "build",
      on: triggers,
      jobs: workflowJobs,
    };

    const workflowFromFile = (await readWorkflowFile(workflowFile)) as typeof workflow;

    assertEquals(workflowFromFile, workflow);
  });
}

function createGHActions(args: CreateGitHubActionsArgs) {
  return createGitHubActions(args);
}

async function readWorkflowFile(file: string): Promise<unknown> {
  const contents = new TextDecoder().decode(await Deno.readFile(file));
  return parseYaml(contents);
}
