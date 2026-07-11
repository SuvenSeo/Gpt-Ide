import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { FileConflictError, FileService } from "../src/file-service.ts";
import { PathPolicy } from "../src/path-policy.ts";

test("writes and reads a UTF-8 file atomically", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "gpt-ide-file-"));
  const service = new FileService(await PathPolicy.create(root));
  const written = await service.writeText("src/index.ts", "export const x = 1;\n");
  assert.equal(written.path, "src/index.ts");
  assert.equal(await readFile(path.join(root, "src/index.ts"), "utf8"), "export const x = 1;\n");
  const loaded = await service.readText("src/index.ts");
  assert.equal(loaded.content, "export const x = 1;\n");
  assert.equal(loaded.hash, written.hash);
});

test("rejects a stale expected hash", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "gpt-ide-file-"));
  const service = new FileService(await PathPolicy.create(root));
  await service.writeText("a.txt", "one");
  await assert.rejects(
    () => service.writeText("a.txt", "two", { expectedHash: "stale" }),
    FileConflictError,
  );
});

test("enforces the configured file-size limit", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "gpt-ide-file-"));
  const service = new FileService(await PathPolicy.create(root), { maxFileBytes: 4 });
  await assert.rejects(() => service.writeText("large.txt", "12345"), /exceeds/);
});
