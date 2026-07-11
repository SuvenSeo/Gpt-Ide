import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { CheckpointService } from "../src/checkpoint-service.ts";
import { PathPolicy } from "../src/path-policy.ts";

test("creates and restores a checkpoint while excluding dependency folders", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "gpt-ide-checkpoint-"));
  await mkdir(path.join(root, "src"));
  await mkdir(path.join(root, "node_modules"));
  await writeFile(path.join(root, "src", "app.ts"), "before");
  await writeFile(path.join(root, "node_modules", "ignored.txt"), "ignored");
  const service = new CheckpointService(await PathPolicy.create(root), {
    maxBytes: 1024 * 1024,
    maxFiles: 100,
  });
  const checkpoint = await service.create("before edit");
  await writeFile(path.join(root, "src", "app.ts"), "after");
  const restored = await service.restore(checkpoint.id);
  assert.equal(restored.restoredFiles, 1);
  assert.equal(await readFile(path.join(root, "src", "app.ts"), "utf8"), "before");
  const listed = await service.list();
  assert.equal(listed.length, 1);
  assert.equal(listed[0]?.label, "before edit");
});
