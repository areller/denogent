import * as path from "https://deno.land/std/path/mod.ts";
import { emptyTempDir, mockDebugLogger } from "../../../internal/testing/helpers.ts";
import { describe } from "../../../internal/testing/test.ts";
import * as fs from "https://deno.land/std/fs/mod.ts";
import { GitHubActions } from "./gh-actions.ts";
import { assertEquals } from "https://deno.land/std@0.72.0/testing/asserts.ts";
import { createGraph, Graph } from "../../../internal/graph/graph.ts";
import { task } from "../../core/task.ts";
import { parse } from "https://deno.land/std/encoding/yaml.ts";

describe('gh-actions.test.ts', t => {
    t.test('clean should clean workflow file', async () => {
        await emptyTempDir(async temp => {
            const workflowsPath = path.join(temp, '.github', 'workflows');
            await fs.ensureDir(workflowsPath);
            const workflowFile = path.join(workflowsPath, 'workflow.yaml');
            await fs.ensureFile(workflowFile);

            assertEquals(await fs.exists(workflowFile), true);

            const ghActions = new GitHubActions('some-image');
            await ghActions.clean({ path: temp, logger: mockDebugLogger() });

            assertEquals(await fs.exists(workflowFile), false);
        });
    });

    t.test('generate should generate a workflow file', async () => {
        await workflowAssertTest(
            new GitHubActions('ubuntu-latest'),
            createSimpleGraph(), 
            'ubuntu-latest',
            {
                push: {
                    branches: ['master']
                }
            },
            [],
            undefined,
            undefined);
    });

    t.test('generate should generate workflow file (branches)', async () => {
        await workflowAssertTest(
            new GitHubActions('ubuntu-latest', undefined, ['master', 'dev'], ['master'], ['v*']),
            createSimpleGraph(),
            'ubuntu-latest',
            {
                push: {
                    branches: ['master', 'dev'],
                    tags: ['v*']
                },
                pull_request: {
                    branches: ['master']
                }
            },
            [],
            undefined,
            undefined);
    });

    t.test('generate should generate a workflow file (secrets)', async () => {
        await workflowAssertTest(
            new GitHubActions('ubuntu-latest'),
            createGraphWithSecrets(),
            'ubuntu-latest',
            {
                push: {
                    branches: ['master']
                }
            },
            [],
            undefined,
            {
                token: '${{ secrets.token }}',
                username: '${{ secrets.username }}',
                password: '${{ secrets.password }}'
            });
    });

    t.test('generate should generate a workflow file (uses)', async () => {
        await workflowAssertTest(
            new GitHubActions('ubuntu-latest'),
            createGraphWithUses(),
            'ubuntu-latest',
            {
                push: {
                    branches: ['master']
                }
            },
            [
                {
                    name: 'nodejs',
                    uses: 'nodejs/nodejs',
                    with: {
                        'node-version': '12.18'
                    }
                },
                {
                    name: 'dotnet',
                    uses: 'dotnet/dotnet',
                    with: {
                        'dotnet-version': '5.0'
                    }
                }
            ],
            undefined,
            undefined);
    });

    t.test('generate should generate a workflow file (services)', async () => {
        await workflowAssertTest(
            new GitHubActions('ubuntu-latest'),
            createGraphWithServices(),
            'ubuntu-latest',
            {
                push: {
                    branches: ['master']
                }
            },
            [],
            {
                serviceA: {
                    image: 'serviceA:0.1',
                    ports: ['8080:8080']
                },
                serviceB: {
                    image: 'serviceB:0.1',
                    ports: ['8081:8081', '8082:8082']
                }
            },
            {
                'SERVICEA_HOST': 'localhost',
                'SERVICEA_PORT': '8080',
                'SERVICEA_PORTS': '8080',
                'SERVICEB_HOST': 'localhost',
                'SERVICEB_PORT': '8081',
                'SERVICEB_PORTS': '8081;8082'
            });
    });
});

function createSimpleGraph(): Graph {
    let a = task('a');
    let b = task('b').dependsOn(a);

    return createGraph([b]);
}

function createGraphWithSecrets(): Graph {
    let a = task('a').property('secrets', ['username', 'password']);
    let b = task('b').dependsOn(a).property('secrets', ['username', 'token']);

    return createGraph([b]);
}

function createGraphWithUses(): Graph {
    const nodeJsUse = {
        name: 'nodejs',
        uses: 'nodejs/nodejs',
        with: {
            'node-version': '12.18'
        }
    };
    const dotnetUse = {
        name: 'dotnet',
        uses: 'dotnet/dotnet',
        with: {
            'dotnet-version': '5.0'
        }
    };

    let a = task('a').property('gh-actions-uses', {
        ['nodejs']: nodeJsUse
    });
    let b = task('b').dependsOn(a).property('gh-actions-uses', {
        ['nodejs']: nodeJsUse,
        ['dotnet']: dotnetUse
    });

    return createGraph([b]);
    
}

function createGraphWithServices(): Graph {
    const serviceA = {
        name: 'serviceA',
        image: 'serviceA:0.1',
        ports: [8080]
    };
    const serviceB = {
        name: 'serviceB',
        image: 'serviceB:0.1',
        ports: [8081, 8082]
    };

    let a = task('a').property('docker-services', {
        ['serviceA']: serviceA
    });
    let b = task('b').dependsOn(a).property('docker-services', {
        ['serviceA']: serviceA,
        ['serviceB']: serviceB
    });

    return createGraph([b]);
}

async function workflowAssertTest(ghActions: GitHubActions, graph: Graph, image: string, triggers: unknown, extraSteps: unknown[], services: unknown, env: unknown) {
    await emptyTempDir(async temp => {
        await ghActions.generate({
            name: 'build',
            buildFile: path.join('build', 'some-build.ts'),
            graph: graph,
            logger: mockDebugLogger(),
            path: temp
        });

        const workflowFile = path.join(temp, '.github', 'workflows', 'build.yml');
        assertEquals(await fs.exists(workflowFile), true);

        let runStep = {
            name: 'run build',
            run: 'deno run -A -q --unstable build/some-build.ts --serial --skip-services --runtime gh-actions run',
            env
        };

        if (env === undefined) {
            delete runStep['env'];
        }

        let workflow = {
            name: 'build',
            on: triggers,
            jobs: {
                [image]: {
                    name: image,
                    'runs-on': image,
                    services,
                    steps: [
                        {
                            name: 'checkout',
                            uses: 'actions/checkout@v2'
                        },
                        {
                            name: 'setup deno',
                            uses: 'denolib/setup-deno@v2',
                            with: {
                                'deno-version': `v${Deno.version.deno}`
                            }
                        },
                        ...extraSteps,
                        runStep
                    ]
                }
            }
        };

        if (services === undefined) {
            delete workflow['jobs'][image]['services'];
        }

        let workflowFromFile = await readWorkflowFile(workflowFile) as typeof workflow;

        assertEquals(workflowFromFile, workflow);
    });
}

async function readWorkflowFile(file: string): Promise<unknown> {
    const contents = new TextDecoder().decode(await Deno.readFile(file));
    return parse(contents);
}