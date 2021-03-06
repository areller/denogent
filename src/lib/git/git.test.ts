import { copyDirToTemp } from "../../internal/testing/helpers.ts";
import { describe } from "../../internal/testing/test.ts";
import git from "./git.ts";
import { runCommand } from "../../internal/helpers/cmd.ts";
import { stdPath } from "../../../deps.ts";
import { assertEquals } from "../../../tests_deps.ts";
import { getCurrentImportPath } from "../../internal/helpers/env.ts";

const assetsPath = stdPath.join(getCurrentImportPath(import.meta.url), "testassets");

describe("git.test.ts", (t) => {
  [[false, "non-repo"] as [boolean, string], [true, "simple-repo"] as [boolean, string]].forEach(
    (asset: [boolean, string]) => {
      t.test(`isGitRepository should return true or false (${asset[1]})`, async () => {
        await copyDirToTemp(stdPath.join(assetsPath, asset[1]), async (temp) => {
          const isRepo = await git.isGitRepository({
            path: temp,
            logger: false,
          });

          assertEquals(isRepo, asset[0]);
        });
      });

      t.test("getBranch should return the current branch", async () => {
        await copyDirToTemp(stdPath.join(assetsPath, "simple-repo"), async (temp) => {
          const branch = await git.getBranch({
            path: temp,
            logger: false,
          });

          assertEquals(branch, "master");
        });
      });

      t.test("getHeadCommit should return the head commit", async () => {
        await copyDirToTemp(stdPath.join(assetsPath, "simple-repo"), async (temp) => {
          const headCommit = await git.getHeadCommit({
            path: temp,
            logger: false,
          });

          assertEquals(headCommit, "ee7ff81ec3800866c0b7e3f1c2f210931778c61d");
        });
      });

      t.test("describe should return undefined when there are no tags", async () => {
        await copyDirToTemp(stdPath.join(assetsPath, "simple-repo"), async (temp) => {
          const describe = await git.describe({
            path: temp,
            logger: false,
          });

          assertEquals(describe, undefined);
        });
      });

      t.test("describe should return closest tag and distance from that tag", async () => {
        await copyDirToTemp(stdPath.join(assetsPath, "tagged-repo"), async (temp) => {
          const describe = await git.describe({
            path: temp,
            logger: false,
          });

          assertEquals(describe, "v0.1-1-g38c9f89");
        });
      });

      t.test("isTagged should return false", async () => {
        await copyDirToTemp(stdPath.join(assetsPath, "tagged-repo"), async (temp) => {
          const isTagged = await git.isTagged({
            path: temp,
            logger: false,
          });

          assertEquals(isTagged, false);
        });
      });

      t.test("isTagged should return true", async () => {
        await copyDirToTemp(stdPath.join(assetsPath, "tagged-repo"), async (temp) => {
          await runCommand(["git", "checkout", "v0.1"], undefined, temp, true);
          const isTagged = await git.isTagged({
            path: temp,
            logger: false,
          });

          assertEquals(isTagged, true);
        });
      });
    },
  );
});
