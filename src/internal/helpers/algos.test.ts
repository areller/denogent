import { task } from "../../lib/core/task.ts";
import { assertEquals } from "../../../tests_deps.ts";
import { describe } from "../testing/test.ts";
import { breadthFirst, breadthFirstWithDepth } from "./algos.ts";

describe("algos.test.ts", (t) => {
  t.test("breadthFirst should do breadth first traversal", () => {
    const a = task("a");
    const a1 = task("a1");
    const b = task("b").dependsOn(a);
    const c = task("c").dependsOn([a, a1]);
    const d = task("d").dependsOn(b);
    const e = task("e").dependsOn(b);
    const log: string[] = [];

    breadthFirst(
      [a],
      (t) => t.dependents.concat(t.dependencies),
      (t) => {
        log.push(t.name);
      },
    );

    assertEquals(log, ["a", "b", "c", "d", "e", "a1"]);
  });

  t.test("breadthFirstWithDepth should do breadth first traversal and record depth", () => {
    const a = task("a");
    const b = task("b").dependsOn(a);
    const c = task("c").dependsOn(a);
    const d = task("d").dependsOn(b);
    const e = task("e").dependsOn([d, c]);
    const log: [string, number][] = [];

    breadthFirstWithDepth(
      [a],
      (t) => t.dependents,
      (t) => t.dependencies,
      (t, depth) => {
        log.push([t.name, depth]);
      },
    );

    assertEquals(log, [
      ["a", 0],
      ["b", 1],
      ["c", 1],
      ["d", 2],
      ["e", 3],
    ]);
  });
});
