# denogent

**Disclaimer: This tool is in active development.**

<div align="center">

[![Actions Status](https://github.com/areller/denogent/workflows/denogent-build/badge.svg)](https://github.com/areller/denogent/actions)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/0a2779fd560245e8adf327a0542b5590)](https://app.codacy.com/gh/areller/denogent?utm_source=github.com&utm_medium=referral&utm_content=areller/denogent&utm_campaign=Badge_Grade)

</div>

[denogent](https://github.com/areller/denogent) is a tool for creating and running build pipelines.

## Installation

To install the latest version of the `denogent` CLI tool, run

```bash
deno install -A --unstable https://deno.land/x/denogent/denogent.ts
```

## The Build File

The `build file` is the place where you define your build pipeline. To create one, run

```bash
denogent create
```

By default, `denogent create` will create the build file at `build/build.ts`. To create the file at a different path, run

```bash
denogent create --file path/to/buid/file.ts
```

Once you open the newly created build file, you'll see  

```typescript
import { createBuilder, task } from "https://deno.land/x/denogent/mod.ts";

const someTask = task('some task')
    .does(async ctx => {
        // do something here
        ctx?.logger.info('doing something');
    });

createBuilder({
    name: 'build',
    targetTasks: someTask,
    ciIntegrations: [] // define CI integrations here
});
```

### Task

A task is a function that executes code inside of the build pipeline.

#### Dependencies

Tasks can have dependencies on other tasks. For example,  

```typescript
const compile = task('compile')
    .does(async ctx => {
        // compile program
    });

const test = task('test')
    .dependsOn(compile)
    .does(async ctx => {
        // run tests
    });

const buildImage = task('build image')
    .dependsOn(compile)
    .does(async ctx => {
        // build image
    });

const publishImage = task('publish image')
    .dependsOn([test, buildImage])
    .does(async ctx => {
        // publish image
    });
```

In this scenario, task `compile` will run at the beginning and then will triggers tasks `test` and `buildImage` which will run in parallel and will then trigger the `publush image` task.

#### Conditions

Tasks can define conditions for their run. For example,  

```typescript
import { git } from "https://deno.land/x/denogent/mod.ts";

...

const publishImage = task('publish image')
    .dependsOn([test, buildImage])
    .when(async ctx => await git.isTagged({ logger: false }))
    .does(async ctx => {
        // publish image
    });
```

In this scenario, we tell the `publish image` to run only when the the commit that has triggered the build is tagged.

## Execute Build Pipeline

To execute the build pipeline locally, run 

```bash
denogent run --file build/build.ts
```

## CI Systems Integration

Although `denogent` provides a tool for executing build pipelines, it's no a CI system.
However, you can run `denogent` pipelines from a CI system, and `denogent` provides convenient way to integrate with popular CI systems.

In the `build.ts` file, in the call to `createBuilder`, you can add a CI system integration. Once you've defined your CI system integration in the build file, run

```bash
denogent generate --file build/build.ts --ci {the name of the CI system}
```

to generate manifests files for said CI system.

### GitHub Actions

Here's an example of integrating with GitHub Actions.  

In `build.ts`  

```typescript
import { createGitHubActions } from "https://deno.land/x/denogent/mod.ts";

...

createBuilder({
    name: 'build',
    targetTasks: someTask,
    ciIntegrations: [
        createGitHubActions({
            image: 'ubuntu-latest',
            onPRBranches: ['master'] // run pipeline on PR that merges to master
        })
    ]
});
```

```bash
denogent generate --file build/build.ts --ci gh-actions
```

## Task Extensions

Task extensions allow you to declare dependency on certain environmental components.

### `docker.service` extension

You can use the `docker.service` extension to declare dependency on a service that needs to run alongside your task.  

For example, if you have a task that runs integration tests which depend on Redis, you can use `docker.service` do declare a dependency on Redis.

```typescript
import { docker } from "https://deno.land/x/denogent/mod.ts";

...

const test = task('test')
    .dependsOn(docker.service({ name: 'redis', image: 'redis', ports: [6379] }))
    .does(async ctx => {
        // run tests...
    });
```