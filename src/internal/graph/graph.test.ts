import { task, Task } from "../../lib/core/task.ts";
import { assertArrayContains, assertEquals } from "../../../tests_deps.ts";
import { describe } from "../testing/test.ts";
import { createGraph } from "./graph.ts";

describe("graph.test.ts", (t) => {
  t.test("taskNames should return all tasks", () => {
    const graph = createGraph(createTaskStructure());
    assertEquals(graph.taskNames.length, 7);
    assertArrayContains(graph.taskNames, ["a", "a1", "b", "b1", "c", "d", "e"]);
  });

  t.test("startTasks should return tasks that should run at the beginning", () => {
    const graph = createGraph(createTaskStructure());
    assertEquals(graph.startTasks, ["a", "a1"]);
  });

  t.test("targetTasks should return tasks that nothing depends on (have no dependents)", () => {
    const graph = createGraph(createTaskStructure());
    assertEquals(graph.targetTasks, ["b1", "e"]);
  });

  t.test("getTasksByLevel should return a map from level to tasks in that level", () => {
    const graph = createGraph(createTaskStructure());
    const levels = graph.getTasksByLevel();
    assertEquals(Object.keys(levels).length, 4);
    assertArrayContains(Object.keys(levels), ["0", "1", "2", "3"]);

    assertEquals(
      levels[0].map((t) => t.name),
      ["a", "a1"],
    );
    assertEquals(
      levels[1].map((t) => t.name),
      ["b", "c"],
    );
    assertEquals(
      levels[2].map((t) => t.name),
      ["b1", "d"],
    );
    assertEquals(
      levels[3].map((t) => t.name),
      ["e"],
    );
  });

  t.test("createTransformed should return a new graph where all the tasks are transformed", async () => {
    const graph = createGraph(createTaskStructure());
    const transformed = await graph.createTransformedGraph((task) => {
      const newTask = { ...task };
      newTask.properties = { foo: newTask.name };
      return newTask;
    });

    assertEquals(graph.getExistingTask("b1").properties["foo"], undefined);
    assertEquals(transformed.getExistingTask("b1").properties["foo"], "b1");
  });
});

function createTaskStructure(): Task[] {
  const a = task("a");
  const a1 = task("a1");
  const b = task("b").dependsOn(a);
  task("b1").dependsOn(b);
  const c = task("c").dependsOn([a, a1]);
  const d = task("d").dependsOn([c]);
  const e = task("e").dependsOn([c, d]);

  return [e];
}
