/**
 * Performs a breadth-first traversal on a given graph with given root vertices.
 * @param roots the root vertices of the graph
 * @param neighborsFn a function that defines how neighbor vertices are retrieved from a given vertex
 * @param fn the function that gets executed for every vertex of the graph
 * @param hashFunction an optional hash function for a vertex, used to detect duplications
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function breadthFirst<TVertex extends object, THash extends string | number>(
  roots: TVertex[],
  neighborsFn: (vertex: TVertex) => TVertex[],
  fn: (vertex: TVertex) => void,
  hashFunction?: (vertex: TVertex) => THash,
): void {
  //const visited = hashFunction === undefined ? new WeakSet() : new Set<unknown>();
  const visited = new SetOfObjectsOrHash(hashFunction);
  const queue: TVertex[] = [...roots];

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
// eslint-disable-next-line @typescript-eslint/ban-types
export function breadthFirstWithDepth<TVertex extends object, THash extends object>(
  roots: TVertex[],
  childrenFn: (vertex: TVertex) => TVertex[],
  parentsFn: (vertex: TVertex) => TVertex[],
  fn: (vertex: TVertex, depth: number) => void,
  hashFunction?: (vertex: TVertex) => THash,
): void {
  const visited = new SetOfObjectsOrHash(hashFunction);
  const refs = new MapOfObjectsOrHash(hashFunction);
  const queue: [TVertex, number][] = [...roots.map((r) => [r, 0] as [TVertex, number])];

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

    const parents = parentsFn(top);
    const children = childrenFn(top);

    if (levelSet.length >= parents.length) {
      fn(top, Math.max(...levelSet));
      refs.delete(top);

      for (const child of children) {
        queue.push([child, depth + 1]);
      }
    }
  }
}

// eslint-disable-next-line @typescript-eslint/ban-types
class SetOfObjectsOrHash<TObject extends object, THash> {
  private _set?: Set<THash>;
  private _weakSet?: WeakSet<TObject>;

  constructor(private hashFunction?: (obj: TObject) => THash) {
    if (this.hashFunction === undefined) {
      this._weakSet = new WeakSet();
    } else {
      this._set = new Set();
    }
  }

  add(member: TObject): void {
    if (this.hashFunction === undefined) {
      this._weakSet?.add(member);
    } else {
      this._set?.add(this.hashFunction(member));
    }
  }

  delete(member: TObject): boolean {
    if (this.hashFunction === undefined) {
      return this._weakSet?.delete(member) ?? false;
    } else {
      return this._set?.delete(this.hashFunction(member)) ?? false;
    }
  }

  has(member: TObject): boolean {
    if (this.hashFunction === undefined) {
      return this._weakSet?.has(member) ?? false;
    } else {
      return this._set?.has(this.hashFunction(member)) ?? false;
    }
  }
}

// eslint-disable-next-line @typescript-eslint/ban-types
class MapOfObjectsOrHash<TObject extends object, THash, TValue> {
  private _map?: Map<THash, TValue>;
  private _weakMap?: WeakMap<TObject, TValue>;

  constructor(private hashFunction?: (obj: TObject) => THash) {
    if (this.hashFunction === undefined) {
      this._weakMap = new WeakMap();
    } else {
      this._map = new Map();
    }
  }

  set(key: TObject, value: TValue) {
    if (this.hashFunction === undefined) {
      this._weakMap?.set(key, value);
    } else {
      this._map?.set(this.hashFunction(key), value);
    }
  }

  get(key: TObject): TValue | undefined {
    if (this.hashFunction === undefined) {
      return this._weakMap?.get(key);
    } else {
      return this._map?.get(this.hashFunction(key));
    }
  }

  delete(key: TObject): boolean {
    if (this.hashFunction === undefined) {
      return this._weakMap?.delete(key) ?? false;
    } else {
      return this._map?.delete(this.hashFunction(key)) ?? false;
    }
  }

  has(key: TObject): boolean {
    if (this.hashFunction === undefined) {
      return this._weakMap?.has(key) ?? false;
    } else {
      return this._map?.has(this.hashFunction(key)) ?? false;
    }
  }
}
