import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { PathPolicy } from "../src/path-policy.ts";
import { PatchService, PatchValidationError } from "../src/patch-service.ts";

const exec = promisify(execFile);

test("rejects patch paths that escape the workspace", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "gpt-ide-patch-"));
  const service = new PatchService(await PathPolicy.create(root));
  const patch = "--- a/../../outside.txt\n+++ b/../../outside.txt\n@@ -1 +1 @@\n-old\n+new\n";
  await assert.rejects(() => service.apply(patch), PatchValidationError);
});

test("checks and applies a valid unified diff", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "gpt-ide-patch-"));
  await exec("git", ["init", "-b", "main"], { cwd: root });
  await writeFile(path.join(root, "file.txt"), "old\n");
  const service = new PatchService(await PathPolicy.create(root));
  const patch = "--- a/file.txt\n+++ b/file.txt\n@@ -1 +1 @@\n-old\n+new\n";
  const result = await service.apply(patch);
  assert.deepEqual(result.files, ["file.txt"]);
  assert.equal(await readFile(path.join(root, "file.txt"), "utf8"), "new\n");
});
