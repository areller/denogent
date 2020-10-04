import { assertArrayContains, assertEquals, assertNotEquals } from "https://deno.land/std@0.72.0/testing/asserts.ts";
import { emptyTempDir } from "../../internal/testing/helpers.ts";
import { describe } from "../../internal/testing/test.ts";
import { Folder } from "./fs.ts";
import * as exPath from "https://deno.land/std/path/mod.ts";
import * as exFs from "https://deno.land/std/fs/mod.ts";

describe('fs.test.ts', t => {
    t.test('getFolder/getFile should return undefined for non existing folder/file', async () => {
        await emptyTempDir(async temp => {
            const folder = new Folder(temp);
            assertEquals(await folder.getFolder('folder1'), undefined);
            assertEquals(await folder.getFile('file1'), undefined);
        });
    });

    t.test('getFolder/getFile should return existing folder/file', async () => {
        await emptyTempDir(async temp => {
            await exFs.ensureDir(exPath.join(temp, 'folder1'));
            await Deno.writeFile(exPath.join(temp, 'folder1', 'file1'), new TextEncoder().encode('contents1'));
            const rootFolder = new Folder(temp);
            const folder1 = await rootFolder.getFolder('folder1');
            assertNotEquals(folder1, undefined);

            const file1 = await folder1!.getFile('file1');

            assertNotEquals(file1, undefined);
            assertEquals(await file1!.getContentsString(), 'contents1');
        });
    });

    t.test('listFolders should return list of folders', async () => {
        await emptyTempDir(async temp => {
            await exFs.ensureDir(exPath.join(temp, 'folder1'));
            await exFs.ensureDir(exPath.join(temp, 'folder2'));
            const rootFolder = new Folder(temp);
            const list = await rootFolder.listFolders();

            assertEquals(list.length, 2);
            assertArrayContains(list.map(f => f.name), ['folder1', 'folder2'])
        });
    });

    t.test('listFiles should return list of files', async () => {
        await emptyTempDir(async temp => {
            await exFs.ensureFile(exPath.join(temp, 'file1'));
            await exFs.ensureFile(exPath.join(temp, 'file2'));

            const rootFolder = new Folder(temp);
            const list = await rootFolder.listFiles();

            assertEquals(list.length, 2);
            assertArrayContains(list.map(f => f.name), ['file1', 'file2']);
        });
    });
});