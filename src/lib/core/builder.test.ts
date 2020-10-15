import { assertNotEquals } from "../../../tests_deps.ts";
import { describe } from "../../internal/testing/test.ts";
import type { CIIntegration } from "../ci/ci_integration.ts";
import { createBuilder } from "./builder.ts";
import { task } from "./task.ts";

const emptyTask = task("hello");

describe("build.test.ts", (t) => {
  t.test("createBuilder should work with CIs without labels", () => {
    createBuilder({
      name: "test",
      targetTasks: [emptyTask],
      ciIntegrations: [createEmptyCIIntegration("typeA"), createEmptyCIIntegration("typeB")],
    });
  });

  t.test("createBuilder should work for multiple CIs of same type with different labels", () => {
    createBuilder({
      name: "test",
      targetTasks: [emptyTask],
      ciIntegrations: [createEmptyCIIntegration("typeA", "labelA"), createEmptyCIIntegration("typeA", "labelB")],
    });
  });

  t.test("createBuilder should work for multiple CI types when some are not labeled", () => {
    createBuilder({
      name: "test",
      targetTasks: [emptyTask],
      ciIntegrations: [
        createEmptyCIIntegration("typeA", "labelA"),
        createEmptyCIIntegration("typeA", "labelB"),
        createEmptyCIIntegration("typeB"),
      ],
    });
  });

  t.test("createBuilder should fail for duplicate labels", () => {
    let error: Error | undefined = undefined;
    try {
      createBuilder({
        name: "test",
        targetTasks: [emptyTask],
        ciIntegrations: [createEmptyCIIntegration("typeA", "labelA"), createEmptyCIIntegration("typeB", "labelA")],
      });
    } catch (err) {
      error = err;
    }

    assertNotEquals(error, undefined);
  });

  t.test("createBuilder should fail for CI type with partial labeling", () => {
    let error: Error | undefined = undefined;
    try {
      createBuilder({
        name: "test",
        targetTasks: [emptyTask],
        ciIntegrations: [createEmptyCIIntegration("typeA", "labelA"), createEmptyCIIntegration("typeA")],
      });
    } catch (err) {
      error = err;
    }

    assertNotEquals(error, undefined);
  });
});

function createEmptyCIIntegration(type: string, label?: string): CIIntegration {
  return {
    type,
    label,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    clean: async () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    generate: async () => {},
    createRuntime: async () => {
      return {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        loggerFn: () => {},
      };
    },
  };
}
