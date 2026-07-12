import assert from "node:assert/strict";
import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { PathPolicy, WorkspacePathError } from "../src/path-policy.ts";

void test("resolves normal paths beneath the workspace", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "gpt-ide-path-"));
  await mkdir(path.join(root, "src"));
  const policy = await PathPolicy.create(root);
  assert.equal(await policy.resolve("src/index.ts"), path.join(root, "src/index.ts"));
});

void test("rejects parent traversal and absolute paths", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "gpt-ide-path-"));
  const policy = await PathPolicy.create(root);
  await assert.rejects(() => policy.resolve("../outside.txt"), WorkspacePathError);
  await assert.rejects(() => policy.resolve(path.resolve(root, "file.txt")), WorkspacePathError);
});

void test("rejects a symlink that resolves outside the workspace", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "gpt-ide-path-"));
  const outside = await mkdtemp(path.join(tmpdir(), "gpt-ide-outside-"));
  await writeFile(path.join(outside, "secret.txt"), "nope");
  await symlink(outside, path.join(root, "escape"), "dir");
  const policy = await PathPolicy.create(root);
  await assert.rejects(() => policy.resolve("escape/secret.txt"), WorkspacePathError);
});
