import { task } from "./task.ts";
import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import { describe } from "../../internal/testing/test.ts";

describe('task.test.ts', t => {
    t.test('dependsOn should create dependency', () => {
        let taskA = task('taskA');
        let taskB = task('taskB');

        taskA.dependsOn(taskB);

        assertEquals(taskA.dependencies, [taskB]);
        assertEquals(taskA.dependents, []);
        assertEquals(taskB.dependents, [taskA]);
        assertEquals(taskB.dependencies, []);
    });

    t.test('triggers should create dependency', () => {
        let taskA = task('taskA');
        let taskB = task('taskB');

        taskA.triggers(taskB);

        assertEquals(taskA.dependencies, []);
        assertEquals(taskA.dependents, [taskB]);
        assertEquals(taskB.dependents, []);
        assertEquals(taskB.dependencies, [taskA]);
    });
});