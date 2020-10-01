import { copyDirToTemp } from "../../internal/testing/helpers.ts";
import { describe } from "../../internal/testing/test.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import git from "./git.ts";
import { assertEquals } from "https://deno.land/std@0.71.0/testing/asserts.ts";

const assetsPath = path.join(path.dirname(import.meta.url), 'testassets').substr('file:'.length);

describe('git.test.ts', t => {
    t.test('isGitRepository should return false on dir without a repo', async () => {
        await copyDirToTemp(path.join(assetsPath, 'non-repo'), async temp => {
            let isRepo = await git.isGitRepository({
                path: temp,
                logger: false
            });

            assertEquals(isRepo, false);
        });
    });
});