import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { CommandPolicy } from "../src/command-policy.ts";
import { PathPolicy } from "../src/path-policy.ts";
import { ProcessService } from "../src/process-service.ts";

void test("runs an allowlisted executable without a shell", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "gpt-ide-process-"));
  const service = new ProcessService(await PathPolicy.create(root), new CommandPolicy(["node"]));
  const result = await service.run("node", ["-e", "process.stdout.write('ok')"]);
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "ok");
  assert.equal(result.timedOut, false);
});

void test("truncates output at the configured byte limit", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "gpt-ide-process-"));
  const service = new ProcessService(await PathPolicy.create(root), new CommandPolicy(["node"]), {
    maxOutputBytes: 8,
  });
  const result = await service.run("node", ["-e", "process.stdout.write('abcdefghijkl')"]);
  assert.equal(result.truncated, true);
  assert.equal(Buffer.byteLength(result.stdout), 8);
});
