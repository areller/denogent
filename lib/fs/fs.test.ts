import { stdPath, stdFs } from "../../deps.ts";
import { emptyTempDir } from "../../internal/testing/helpers.ts";
import { describe } from "../../internal/testing/test.ts";
import { assertArrayContains, assertEquals, assertNotEquals } from "../../tests_deps.ts";
import { Folder } from "./fs.ts";

describe("fs.test.ts", (t) => {
  t.test("getFolder/getFile should return undefined for non existing folder/file", async () => {
    await emptyTempDir(async (temp) => {
      const folder = new Folder(temp);
      assertEquals(await folder.getFolder("folder1"), undefined);
      assertEquals(await folder.getFile("file1"), undefined);
    });
  });

  t.test("getFolder/getFile should return existing folder/file", async () => {
    await emptyTempDir(async (temp) => {
      await stdFs.ensureDir(stdPath.join(temp, "folder1"));
      await Deno.writeFile(stdPath.join(temp, "folder1", "file1"), new TextEncoder().encode("contents1"));
      const rootFolder = new Folder(temp);
      const folder1 = await rootFolder.getFolder("folder1");
      assertNotEquals(folder1, undefined);

      const file1 = await folder1!.getFile("file1");

      assertNotEquals(file1, undefined);
      assertEquals(await file1!.getContentsString(), "contents1");
    });
  });

  t.test("listFolders should return list of folders", async () => {
    await emptyTempDir(async (temp) => {
      await stdFs.ensureDir(stdPath.join(temp, "folder1"));
      await stdFs.ensureDir(stdPath.join(temp, "folder2"));
      const rootFolder = new Folder(temp);
      const list = await rootFolder.listFolders();

      assertEquals(list.length, 2);
      assertArrayContains(
        list.map((f) => f.name),
        ["folder1", "folder2"],
      );
    });
  });

  t.test("listFiles should return list of files", async () => {
    await emptyTempDir(async (temp) => {
      await stdFs.ensureFile(stdPath.join(temp, "file1"));
      await stdFs.ensureFile(stdPath.join(temp, "file2"));

      const rootFolder = new Folder(temp);
      const list = await rootFolder.listFiles();

      assertEquals(list.length, 2);
      assertArrayContains(
        list.map((f) => f.name),
        ["file1", "file2"],
      );
    });
  });
});
