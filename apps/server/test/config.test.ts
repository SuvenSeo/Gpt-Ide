import assert from "node:assert/strict";
import test from "node:test";

import { loadConfig } from "../src/config.ts";

void test("loads secure defaults and resolves the workspace", () => {
  const config = loadConfig({ WORKSPACE_ROOT: "." }, "/tmp/example");
  assert.equal(config.workspaceRoot, "/tmp/example");
  assert.equal(config.host, "127.0.0.1");
  assert.equal(config.port, 8000);
  assert.ok(config.commandAllowlist.has("npm"));
  assert.ok(config.allowedHosts.has("localhost"));
});

void test("rejects invalid numeric limits", () => {
  assert.throws(
    () => loadConfig({ WORKSPACE_ROOT: ".", MAX_FILE_BYTES: "0" }, "/tmp/example"),
    /MAX_FILE_BYTES/
  );
});
