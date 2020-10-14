export function test(name: string, fn: () => void | Promise<void>): void {
  const filename = import.meta.url;
  Deno.test(`[${filename}] ${name}`, fn);
}

class TestCollection {
  private _title: string;

  constructor(private _name: string, private _fn: (t: TestCollection) => void, private parent?: TestCollection) {
    this._title = parent === undefined ? `[${_name}]` : `${parent._title} [${_name}]`;
    _fn(this);
  }

  public test(name: string, fn: () => void | Promise<void>): void {
    Deno.test({
      name: `${this._title} ${name}`,
      fn: fn,
      sanitizeResources: false,
      sanitizeOps: false,
    });
  }

  public describe(name: string, fn: (t: TestCollection) => void): void {
    new TestCollection(name, fn, this);
  }
}

export function describe(name: string, fn: (t: TestCollection) => void): void {
  new TestCollection("[unit] " + name, fn);
}

export function describeE2E(name: string, fn: (t: TestCollection) => void): void {
  new TestCollection("[e2e] " + name, fn);
}
