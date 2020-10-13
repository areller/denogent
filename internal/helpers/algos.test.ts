import { task } from '../../lib/core/task.ts';
import { assertEquals } from '../../tests_deps.ts';
import { describe } from '../testing/test.ts';
import { breadthFirst, breadthFirstWithDepth } from './algos.ts';

describe('algos.test.ts', t => {
  t.test('breadthFirst should do breadth first traversal', () => {
    let a = task('a');
    let a1 = task('a1');
    let b = task('b').dependsOn(a);
    let c = task('c').dependsOn([a, a1]);
    let d = task('d').dependsOn(b);
    let e = task('e').dependsOn(b);
    let log: string[] = [];

    breadthFirst(
      [a],
      t => t.dependents.concat(t.dependencies),
      t => {
        log.push(t.name);
      },
    );

    assertEquals(log, ['a', 'b', 'c', 'd', 'e', 'a1']);
  });

  t.test('breadthFirstWithDepth should do breadth first traversal and record depth', () => {
    let a = task('a');
    let b = task('b').dependsOn(a);
    let c = task('c').dependsOn(a);
    let d = task('d').dependsOn(b);
    let e = task('e').dependsOn([d, c]);
    let log: [string, number][] = [];

    breadthFirstWithDepth(
      [a],
      t => t.dependents,
      t => t.dependencies,
      (t, depth) => {
        log.push([t.name, depth]);
      },
    );

    assertEquals(log, [
      ['a', 0],
      ['b', 1],
      ['c', 1],
      ['d', 2],
      ['e', 3],
    ]);
  });
});
