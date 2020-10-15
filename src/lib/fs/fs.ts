import { stdFs, stdPath } from "../../../deps.ts";

export class File {
  private _name: string;

  constructor(private _path: string) {
    this._name = stdPath.parse(_path).name;
  }

  /**
   * Appends content to the file.
   * @param data content to append to the file.
   */
  public async append(data: Uint8Array | string): Promise<void> {
    await Deno.writeFile(this._path, data instanceof Uint8Array ? data : new TextEncoder().encode(data), {
      append: true,
    });
  }

  /**
   * Replaces the contents of the file with new contents.
   * @param data the new contents of the file.
   */
  public async override(data: Uint8Array | string): Promise<void> {
    await Deno.writeFile(this._path, data instanceof Uint8Array ? data : new TextEncoder().encode(data), {
      append: false,
    });
  }

  /**
   * Gets the contents of the file.
   */
  public async getContents(): Promise<Uint8Array> {
    return await Deno.readFile(this._path);
  }

  /**
   * Gets the contents of the file as a string.
   */
  public async getContentsString(): Promise<string> {
    const contents = await this.getContents();
    return new TextDecoder().decode(contents);
  }

  /**
   * Deletes the file.
   */
  public async delete(): Promise<void> {
    await Deno.remove(this._path);
  }

  /**
   * Gets the path of the file.
   */
  public get path(): string {
    return this._path;
  }

  /**
   * Gets the name of the file.
   */
  public get name(): string {
    return this._name;
  }
}

export class Folder {
  private _name: string;

  constructor(private _path: string) {
    this._name = stdPath.parse(_path).name;
  }

  /**
   * Lists all the files in the current folder.
   */
  public async listFiles(): Promise<File[]> {
    const files: File[] = [];
    for await (const entry of stdFs.walk(this._path, {
      maxDepth: 1,
      includeFiles: true,
      includeDirs: false,
    })) {
      if (entry.isFile) {
        files.push(new File(stdPath.join(this._path, entry.name)));
      }
    }

    return files;
  }

  /**
   * Lists all the folders in the current folder.
   */
  public async listFolders(): Promise<Folder[]> {
    const folders: Folder[] = [];
    for await (const entry of stdFs.walk(this._path, {
      maxDepth: 1,
      includeFiles: false,
      includeDirs: true,
    })) {
      if (entry.isDirectory && stdPath.normalize(entry.path) !== stdPath.normalize(this._path)) {
        folders.push(new Folder(stdPath.join(this._path, entry.name)));
      }
    }

    return folders;
  }

  /**
   * Walk the file tree starting the current folder.
   * @param options walk options
   */
  public walk(options: stdFs.WalkOptions): AsyncIterableIterator<stdFs.WalkEntry> {
    return stdFs.walk(this._path, options);
  }

  /**
   * Return a folder from within the current folder.
   * @param path the path to the folder.
   */
  public async getFolder(path: string | string[]): Promise<Folder | undefined> {
    const folderPath = stdPath.join(this._path, path instanceof Array ? stdPath.join(...path) : path);
    if (!(await stdFs.exists(folderPath))) {
      return undefined;
    }

    return new Folder(folderPath);
  }

  /**
   * Returns a file from within the current folder.
   * @param path the path to the file.
   */
  public async getFile(path: string | string[]): Promise<File | undefined> {
    const filePath = stdPath.join(this._path, path instanceof Array ? stdPath.join(...path) : path);
    if (!(await stdFs.exists(filePath))) {
      return undefined;
    }

    return new File(filePath);
  }

  /**
   * Creates a new folder from within the current folder.
   * @param path the path to the folder.
   */
  public async createFolder(path: string | string[]): Promise<boolean> {
    const folderPath = stdPath.join(this._path, path instanceof Array ? stdPath.join(...path) : path);
    if (await stdFs.exists(folderPath)) {
      return false;
    }

    await stdFs.ensureDir(folderPath);
    return true;
  }

  /**
   * Creates a new file from within the current folder.
   * @param path the path to the file.
   * @param data optional contents for the new file.
   */
  public async createFile(path: string | string[], data: Uint8Array | string | undefined): Promise<File | undefined> {
    const filePath = stdPath.join(this._path, path instanceof Array ? stdPath.join(...path) : path);
    if (await stdFs.exists(filePath)) {
      return undefined;
    }

    await stdFs.ensureFile(filePath);
    if (data !== undefined) {
      await Deno.writeFile(filePath, data instanceof Uint8Array ? data : new TextEncoder().encode(data));
    }

    return new File(filePath);
  }

  /**
   * Gets the path of the folder.
   */
  public get path(): string {
    return this._path;
  }

  /**
   * Gets the name of the folder.
   */
  public get name(): string {
    return this._name;
  }
}

const fs = new Folder(".");
export default fs;
