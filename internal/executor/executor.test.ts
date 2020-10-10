import { task } from "../../lib/core/task.ts";
import { createGraph } from "../graph/graph.ts";
import { describe } from "../testing/test.ts";
import { createExecutor, ExecutionResult } from "./executor.ts";
import { assertEquals, assertNotEquals, fail } from "../../tests_deps.ts";
import type { TaskEvent, TaskFailedEvent } from "./events.ts";

describe('executor.test.ts', t => {
    t.test('single task', async () => {
        const graph = createGraph([task('taskA')]);
        const execution = createExecutor().fromGraph(graph);
        const res = await execution.execute();
        
        assertEquals(res, {
            tasks: {
                ['taskA']: {
                    task: 'taskA',
                    success: true,
                    logs: [],
                    lastEvent: {
                        type: 'finishedSuccessfully',
                        task: 'taskA'
                    }
                }
            }
        });
    });

    t.test('single task (hooks)', async () => {
        let log: string[] = [];

        const graph = createGraph([task('taskA').does(_ => { log.push('taskA') })]);
        const execution = createExecutor().fromGraph(graph);

        execution.beforeTask(async task => {
            log.push('pre: ' + task.name);
        });

        execution.afterTask(async (task, error) => {
            assertEquals(error, undefined);
            log.push('post: ' + task.name);
        });

       const res = await execution.execute();

       assertEquals(res, {
            tasks: {
                ['taskA']: {
                    task: 'taskA',
                    success: true,
                    logs: [],
                    lastEvent: {
                        type: 'finishedSuccessfully',
                        task: 'taskA'
                    }
                }
            }
        });

        assertEquals(log, ['pre: taskA', 'taskA', 'post: taskA']);
    });

    t.test('single task (events)', async () => {
        const graph = createGraph([task('taskA').does(ctx => { ctx?.logger.debug('hello') })]);
        const execution = createExecutor().fromGraph(graph);

        let eventLog: TaskEvent[] = [];

        execution.subscribe(ev => {
            eventLog.push(ev);
        });

        const res = await execution.execute();

        assertEquals(res, {
            tasks: {
                ['taskA']: {
                    task: 'taskA',
                    success: true,
                    logs: [
                        {
                            type: 'log',
                            task: 'taskA',
                            level: 'debug',
                            message: 'hello',
                            error: undefined
                        }
                    ],
                    lastEvent: {
                        type: 'finishedSuccessfully',
                        task: 'taskA'
                    }
                }
            }
        });

        assertEquals(eventLog, [
            {
                type: 'started',
                task: 'taskA'
            },
            {
                type: 'log',
                task: 'taskA',
                level: 'debug',
                message: 'hello',
                error: undefined
            },
            {
                type: 'finishedSuccessfully',
                task: 'taskA'
            }
        ]);
    });

    t.test('single task (failed condition)', async () => {
        const graph = createGraph([
            task('taskA')
                .when(_ => false)
                .does(ctx => { ctx?.logger.debug('hello') })
        ]);
        const execution = createExecutor().fromGraph(graph);

        let eventLog: TaskEvent[] = [];

        execution.subscribe(ev => {
            eventLog.push(ev);
        });

        const res = await execution.execute();

        assertEquals(res, {
            tasks: {
                ['taskA']: {
                    task: 'taskA',
                    success: false,
                    logs: [],
                    lastEvent: {
                        type: 'failedCondition',
                        task: 'taskA',
                        conditionId: 0,
                        condition: '_ => false'
                    }
                }
            }
        });

        assertEquals(eventLog, [
            {
                type: 'started',
                task: 'taskA'
            },
            {
                type: 'failedCondition',
                task: 'taskA',
                conditionId: 0,
                condition: '_ => false'
            }
        ]);
    });

    [false, true].forEach(propagateExceptions => {
        t.test(`single task (failed and propagateExceptions = ${propagateExceptions ? 'true' : 'false'})`, async () => {
            const graph = createGraph([
                task('taskA')
                    .breakCircuit(!propagateExceptions)
                    .does(ctx => { 
                        ctx?.logger.debug('hello');
                        throw new Error('failure.');
                    })
            ]);
            const execution = createExecutor().fromGraph(graph);
    
            let eventLog: TaskEvent[] = [];
    
            execution.subscribe(ev => {
                eventLog.push(ev);
            });

            let res: ExecutionResult | undefined;
            
            try {
                res = await execution.execute();
            }
            catch (err) {
                if (!propagateExceptions) {
                    return fail(`propagated exception`);
                }

                assertEquals(eventLog, [
                    {
                        type: 'started',
                        task: 'taskA'
                    },
                    {
                        type: 'log',
                        task: 'taskA',
                        level: 'debug',
                        message: 'hello',
                        error: undefined
                    }
                ]);
            }

            if (res !== undefined) {
                if (propagateExceptions) {
                    return fail(`didn't propagate exception`);
                }
                
                assertEquals(res, {
                    tasks: {
                        ['taskA']: {
                            task: 'taskA',
                            success: false,
                            logs: [
                                {
                                    type: 'log',
                                    task: 'taskA',
                                    level: 'debug',
                                    message: 'hello',
                                    error: undefined
                                }
                            ],
                            lastEvent: {
                                type: 'failed',
                                task: 'taskA',
                                error: (res.tasks['taskA'].lastEvent as TaskFailedEvent).error
                            }
                        }
                    }
                });
                assertEquals((res.tasks['taskA'].lastEvent as TaskFailedEvent).error?.message, 'failure.');
            }
        });
    });

    [false, true].forEach(propagateExceptions => {
        t.test(`single task (afterTask is called) (failed and propagateExceptions = ${propagateExceptions ? 'true' : 'false'})`, async () => {
            let log: string[] = [];

            const graph = createGraph([
                task('taskA')
                    .breakCircuit(!propagateExceptions)
                    .does(ctx => { 
                        log.push('taskA');
                        throw new Error('failure.');
                    })
            ]);
            const execution = createExecutor().fromGraph(graph);
            
            execution.beforeTask(async task => {
                log.push('pre: ' + task.name);
            });

            execution.afterTask(async (task, error) => {
                assertNotEquals(error, undefined);
                log.push('post: ' + task.name + ' ' + error!.message);
            });

            try {
                await execution.execute();
            }
            // deno-lint-ignore no-empty
            catch (err) {
                
            }

            assertEquals(log, ['pre: taskA', 'taskA', 'post: taskA failure.']);
        });
    });

    t.test('two tasks', async () => {
        const taskA = task('taskA').does(ctx => ctx?.logger.debug('helloA'));
        const taskB = task('taskB').dependsOn(taskA).does(ctx => ctx?.logger.debug('helloB'));
        const graph = createGraph([taskB]);
        const execution = createExecutor().fromGraph(graph);

        let eventLog: TaskEvent[] = [];

        execution.subscribe(ev => {
            eventLog.push(ev);
        });

        const res = await execution.execute();

        assertEquals(res, {
             tasks: {
                 ['taskA']: {
                     task: 'taskA',
                     success: true,
                     logs: [
                        {
                            type: 'log',
                            task: 'taskA',
                            level: 'debug',
                            message: 'helloA',
                            error: undefined
                        }
                     ],
                     lastEvent: {
                         type: 'finishedSuccessfully',
                         task: 'taskA'
                     }
                 },
                 ['taskB']: {
                     task: 'taskB',
                     success: true,
                     logs: [
                         {
                             type: 'log',
                             task: 'taskB',
                             level: 'debug',
                             message: 'helloB',
                             error: undefined
                         }
                     ],
                     lastEvent: {
                         type: 'finishedSuccessfully',
                         task: 'taskB'
                     }
                 }
             }
        });
    });

    [false, true].forEach(propagateExceptions => {
        t.test(`two tasks (first failed and propagateExceptions = ${propagateExceptions ? 'true' : 'false'})`, async () => {
            const taskA = task('taskA')
                .breakCircuit(!propagateExceptions)
                .does(ctx => { 
                    ctx?.logger.debug('helloA');
                    throw new Error('failure.');
                });
            const taskB = task('taskB').dependsOn(taskA).does(ctx => ctx?.logger.debug('helloB'));
            const graph = createGraph([taskB]);
            const execution = createExecutor().fromGraph(graph);

            let eventLog: TaskEvent[] = [];

            execution.subscribe(ev => {
                eventLog.push(ev);
            });

            let res: ExecutionResult | undefined;

            try {
                res = await execution.execute();
            }
            catch (err) {
                if (!propagateExceptions) {
                    return fail(`propagated exception`);
                }

                assertEquals(eventLog, [
                    {
                        type: 'started',
                        task: 'taskA'
                    },
                    {
                        type: 'log',
                        task: 'taskA',
                        level: 'debug',
                        message: 'helloA',
                        error: undefined
                    }
                ]);
            }

            if (res !== undefined) {
                if (propagateExceptions) {
                    return fail(`didn't propagate exception`);
                }
                
                assertEquals(res, {
                    tasks: {
                        ['taskA']: {
                            task: 'taskA',
                            success: false,
                            logs: [
                                {
                                    type: 'log',
                                    task: 'taskA',
                                    level: 'debug',
                                    message: 'helloA',
                                    error: undefined
                                }
                            ],
                            lastEvent: {
                                type: 'failed',
                                task: 'taskA',
                                error: (res.tasks['taskA'].lastEvent as TaskFailedEvent).error
                            }
                        },
                        ['taskB']: {
                            task: 'taskB',
                            success: true,
                            logs: [
                                {
                                    type: 'log',
                                    task: 'taskB',
                                    level: 'debug',
                                    message: 'helloB',
                                    error: undefined
                                }
                            ],
                            lastEvent: {
                                type: 'finishedSuccessfully',
                                task: 'taskB'
                            }
                        }
                    }
                });
                assertEquals((res.tasks['taskA'].lastEvent as TaskFailedEvent).error?.message, 'failure.');
            }
        });
    });
});