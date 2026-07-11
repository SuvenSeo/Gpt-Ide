import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { GitService } from "../src/git-service.ts";
import { PathPolicy } from "../src/path-policy.ts";

const exec = promisify(execFile);

test("reports branch, changed files, and a diff", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "gpt-ide-git-"));
  await exec("git", ["init", "-b", "main"], { cwd: root });
  await exec("git", ["config", "user.email", "test@example.com"], { cwd: root });
  await exec("git", ["config", "user.name", "Test"], { cwd: root });
  await writeFile(path.join(root, "file.txt"), "before\n");
  await exec("git", ["add", "file.txt"], { cwd: root });
  await exec("git", ["commit", "-m", "initial"], { cwd: root });
  await writeFile(path.join(root, "file.txt"), "after\n");
  const service = new GitService(await PathPolicy.create(root));
  const status = await service.status();
  assert.equal(status.branch, "main");
  assert.equal(status.files[0]?.path, "file.txt");
  const diff = await service.diff({ path: "file.txt" });
  assert.match(diff.diff, /-before/);
  assert.match(diff.diff, /\+after/);
});
