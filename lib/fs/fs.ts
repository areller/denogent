import * as exPath from "https://deno.land/std/path/mod.ts";
import * as exFs from "https://deno.land/std/fs/mod.ts";
import type { WalkOptions } from "https://deno.land/std/fs/mod.ts";

export class File {

    private _name: string;

    constructor(private _path: string) {
        this._name = exPath.parse(_path).name;
    }

    /**
     * Appends content to the file.
     * @param data content to append to the file.
     */
    async append(data: Uint8Array | string): Promise<void> {
        await Deno.writeFile(this._path, data instanceof Uint8Array ? data : new TextEncoder().encode(data), { append: true });
    }

    /**
     * Replaces the contents of the file with new contents.
     * @param data the new contents of the file.
     */
    async override(data: Uint8Array | string): Promise<void> {
        await Deno.writeFile(this._path, data instanceof Uint8Array ? data : new TextEncoder().encode(data), { append: false });
    }

    /**
     * Gets the contents of the file.
     */
    async getContents(): Promise<Uint8Array> {
        return await Deno.readFile(this._path);
    }

    /**
     * Gets the contents of the file as a string.
     */
    async getContentsString(): Promise<string> {
        const contents = await this.getContents();
        return new TextDecoder().decode(contents);
    }

    /**
     * Deletes the file.
     */
    async delete(): Promise<void> {
        await Deno.remove(this._path);
    }

    /**
     * Gets the path of the file.
     */
    get path(): string {
        return this._path;
    }

    /**
     * Gets the name of the file.
     */
    get name(): string {
        return this._name;
    }
}

export class Folder {

    private _name: string;

    constructor(private _path: string) {
        this._name = exPath.parse(_path).name;
    }

    /**
     * Lists all the files in the current folder.
     */
    async listFiles(): Promise<File[]> {
        var files: File[] = [];
        for await (const entry of exFs.walk(this._path, { maxDepth: 1, includeFiles: true, includeDirs: false })) {
            if (entry.isFile) {
                files.push(new File(exPath.join(this._path, entry.name)));
            }
        }

        return files;
    }

    /**
     * Lists all the folders in the current folder.
     */
    async listFolders(): Promise<Folder[]> {
        var folders: Folder[] = [];
        for await (const entry of exFs.walk(this._path, { maxDepth: 1, includeFiles: false, includeDirs: true })) {
            if (entry.isDirectory && exPath.normalize(entry.path) != exPath.normalize(this._path)) {
                folders.push(new Folder(exPath.join(this._path, entry.name)));
            }
        }

        return folders;
    }

    /**
     * Walk the file tree starting the current folder.
     * @param options walk options
     */
    walk(options: WalkOptions): AsyncIterableIterator<exFs.WalkEntry> {
        return exFs.walk(this._path, options);
    }

    /**
     * Return a folder from within the current folder.
     * @param path the path to the folder.
     */
    async getFolder(path: string | string[]): Promise<Folder | undefined> {
        const folderPath = exPath.join(this._path, path instanceof Array ? exPath.join(...path) : path);
        if (!(await exFs.exists(folderPath))) {
            return undefined;
        }

        return new Folder(folderPath);
    }

    /**
     * Returns a file from within the current folder.
     * @param path the path to the file.
     */
    async getFile(path: string | string[]): Promise<File | undefined> {
        const filePath = exPath.join(this._path, path instanceof Array ? exPath.join(...path) : path);
        if (!(await exFs.exists(filePath))) {
            return undefined;
        }

        return new File(filePath);
    }

    /**
     * Creates a new folder from within the current folder.
     * @param path the path to the folder.
     */
    async createFolder(path: string | string[]): Promise<boolean> {
        const folderPath = exPath.join(this._path, path instanceof Array ? exPath.join(...path) : path);
        if (await exFs.exists(folderPath)) {
            return false;
        }

        await exFs.ensureDir(folderPath);
        return true;
    }

    /**
     * Creates a new file from within the current folder.
     * @param path the path to the file.
     * @param data optional contents for the new file.
     */
    async createFile(path: string | string[], data: Uint8Array | string | undefined): Promise<File | undefined> {
        const filePath = exPath.join(this._path, path instanceof Array ? exPath.join(...path) : path);
        if (await exFs.exists(filePath)) {
            return undefined;
        }

        await exFs.ensureFile(filePath);
        if (data !== undefined) {
            await Deno.writeFile(filePath, data instanceof Uint8Array ? data : new TextEncoder().encode(data));
        }

        return new File(filePath);
    }

    /**
     * Gets the path of the folder.
     */
    get path(): string {
        return this._path;
    }

    /**
     * Gets the name of the folder.
     */
    get name(): string {
        return this._name;
    }
}

const fs = new Folder('.');
export default fs;