import { Task, task } from "./task.ts";
import { describe } from "../../internal/testing/test.ts";
import { assertEquals } from "../../tests_deps.ts";

describe("task.test.ts", t => {
  t.test("dependsOn should create dependency", () => {
    let taskA = task("taskA");
    let taskB = task("taskB");

    taskA.dependsOn(taskB);

    assertEquals(taskA.dependencies, [taskB]);
    assertEquals(taskA.dependents, []);
    assertEquals(taskB.dependents, [taskA]);
    assertEquals(taskB.dependencies, []);
  });

  t.test("triggers should create dependency", () => {
    let taskA = task("taskA");
    let taskB = task("taskB");

    taskA.triggers(taskB);

    assertEquals(taskA.dependencies, []);
    assertEquals(taskA.dependents, [taskB]);
    assertEquals(taskB.dependents, []);
    assertEquals(taskB.dependencies, [taskA]);
  });

  t.test("tag should add a tag", () => {
    let taskA = task("taskA");
    taskA.tag("tagA", "valueA").tag("tagB", "valueB").tag("tagB", "valueC");

    assertEquals(taskA.tags, {
      ["tagA"]: ["valueA"],
      ["tagB"]: ["valueB", "valueC"],
    });
  });

  t.test("property should add a property", () => {
    let taskA = task("taskA");
    taskA.property("propA", {
      valA: "valueA",
      valB: "valueB",
    });

    assertEquals(taskA.properties, {
      ["propA"]: {
        valA: "valueA",
        valB: "valueB",
      },
    });
  });

  t.test("dependsOn extension should call enrich and add extension", () => {
    let taskA = task("taskA");
    const ext = {
      name: "ext1",
      key: "ext1_1",
      enrich: (t: Task) => {
        t.tag("tagA", "ext1");
      },
    };
    taskA.dependsOn(ext);

    assertEquals(taskA.tags, {
      ["tagA"]: ["ext1"],
    });
    assertEquals(taskA.extensions, [ext]);
  });

  t.test("propagateExceptions should be true by default", () => {
    let taskA = task("taskA");
    assertEquals(taskA.propagateExceptions, true);
  });

  [false, true, undefined].forEach(breakCircuit => {
    const breakCircuitStr = breakCircuit === undefined ? "default" : breakCircuit ? "true" : "false";
    t.test(`breakCircuit = ${breakCircuitStr} should set propagateExceptions accordingly`, () => {
      let taskA = task("A");
      if (breakCircuit === undefined) {
        taskA.breakCircuit();
        assertEquals(taskA.propagateExceptions, false);
      } else {
        taskA.breakCircuit(breakCircuit);
        assertEquals(taskA.propagateExceptions, !breakCircuit);
      }
    });
  });
});
