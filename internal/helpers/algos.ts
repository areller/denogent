/**
 * Performs a breadth-first traversal on a given graph with given root vertices.
 * @param roots the root vertices of the graph
 * @param neighborsFn a function that defines how neighbor vertices are retrieved from a given vertex
 * @param fn the function that gets executed for every vertex of the graph
 */
// deno-lint-ignore ban-types
export function breadthFirst<TVertex extends object>(
  roots: TVertex[],
  neighborsFn: (vertex: TVertex) => TVertex[],
  fn: (vertex: TVertex) => void,
) {
  let visited = new WeakSet();
  let queue: TVertex[] = [...roots];

  while (queue.length > 0) {
    const top = queue.splice(0, 1)[0];
    if (visited.has(top)) {
      continue;
    }

    fn(top);

    for (const neighbor of neighborsFn(top)) {
      queue.push(neighbor);
    }

    visited.add(top);
  }
}

/**
 * Performs a breadth-first traversal on a given graph with a given root vertices, while keeping track of the traversal depth.
 * The traversal depth is a measure of the longest distance between a node and the root of the graph.
 * 
 * For example,
 * 
 *     A
 *    / \
 *   B   C
 *   |   |
 *   D   |
 *   \  /
 *    E
 * 
 * The depth of A is 0, the depth of B and C is 1, the depth of D is 2 and the depth of E is 3.
 * 
 * @param roots the root vertices of the graph
 * @param childrenFn a function that defines how children vertices are retrieved from a given vertex (a child is one level deeper than a parent)
 * @param parentsFn a function that defines how parent vertices are retrieved from a given vertex (a child is one level deeper than a parent)
 * @param fn the function that gets executed for every vertex of the graph
 */
// deno-lint-ignore ban-types
export function breadthFirstWithDepth<TVertex extends object>(
  roots: TVertex[],
  childrenFn: (vertex: TVertex) => TVertex[],
  parentsFn: (vertex: TVertex) => TVertex[],
  fn: (vertex: TVertex, depth: number) => void,
) {
  let visited = new WeakSet();
  let refs = new WeakMap();
  let queue: [TVertex, number][] = [
    ...roots.map((r) => [r, 0] as [TVertex, number]),
  ];

  while (queue.length > 0) {
    const [top, depth] = queue.splice(0, 1)[0];
    if (visited.has(top)) {
      continue;
    }

    let levelSet: number[];
    if (!refs.has(top)) {
      levelSet = [];
      refs.set(top, levelSet);
    } else {
      levelSet = refs.get(top) as number[];
    }

    levelSet.push(depth);

    let parents = parentsFn(top);
    let children = childrenFn(top);

    if (levelSet.length >= parents.length) {
      fn(top, Math.max(...levelSet));
      refs.delete(top);

      for (const child of children) {
        queue.push([child, depth + 1]);
      }
    }
  }
}
